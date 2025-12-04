-- 1. Create enum for roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'client', 'fiscal', 'contabil', 'geral');
  END IF;
END$$;

-- 2. Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3. Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create SECURITY DEFINER function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Create function to check if user is any admin role
CREATE OR REPLACE FUNCTION public.is_any_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('admin', 'fiscal', 'contabil', 'geral')
  )
$$;

-- 6. RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Only admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Migrate existing roles from users table
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role 
FROM public.users 
WHERE role IS NOT NULL AND role != ''
ON CONFLICT (user_id, role) DO NOTHING;

-- 8. Drop problematic RLS policies on users table
DROP POLICY IF EXISTS "Self or Admin Read Access" ON public.users;
DROP POLICY IF EXISTS "Admin can view all user data" ON public.users;

-- 9. Drop problematic RLS policies on fiscal_events table
DROP POLICY IF EXISTS "Admin can manage fiscal events" ON public.fiscal_events;

-- 10. Create new secure policies for users table
CREATE POLICY "Users can view their own data"
ON public.users FOR SELECT
USING (id = auth.uid() OR public.is_any_admin(auth.uid()));

-- 11. Create new secure policy for fiscal_events
CREATE POLICY "Admins can manage fiscal events"
ON public.fiscal_events FOR ALL
USING (public.is_any_admin(auth.uid()));

-- 12. Update the is_admin function to use user_roles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;