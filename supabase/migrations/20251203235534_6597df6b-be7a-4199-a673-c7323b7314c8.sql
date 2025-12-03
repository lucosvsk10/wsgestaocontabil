-- =====================================================
-- SECURITY FIX: Remove dangerous RLS policies
-- =====================================================

-- 1. Fix fiscal_events: Remove the dangerous "Allow all operations" policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.fiscal_events;

-- 2. Fix users table: Remove overly permissive INSERT policy
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;

-- 3. Create proper INSERT policy for users table
CREATE POLICY "Users can only insert their own profile"
ON public.users
FOR INSERT
WITH CHECK (id = auth.uid());

-- 4. Create proper UPDATE policy for users table (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile"
    ON public.users
    FOR UPDATE
    USING (id = auth.uid());
  END IF;
END $$;