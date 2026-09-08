import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { checkIsAdmin } from '@/utils/auth/userChecks';
import { supabase } from '@/integrations/supabase/client';
import AppLoadingScreen from '@/components/AppLoadingScreen';

interface PrivateRouteProps {
  children: JSX.Element;
  requiredRole?: string;
}

type ProductAccess = { saas: boolean; extractor: boolean };

const PrivateRoute = ({ children, requiredRole }: PrivateRouteProps) => {
  const { user, userData, isLoading } = useAuth();
  const location = useLocation();
  const admin = checkIsAdmin(userData, user?.email);
  const [access, setAccess] = useState<ProductAccess | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!user || admin) {
      setAccess({ saas: false, extractor: false });
      return () => {
        cancelled = true;
      };
    }

    setAccess(null);
    Promise.all([
      (supabase as any)
        .from('organization_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1),
      (supabase as any)
        .from('extractor_accounts')
        .select('id')
        .limit(1),
    ]).then(([saasResult, extractorResult]) => {
      if (cancelled) return;
      setAccess({
        saas: !saasResult.error && Boolean(saasResult.data?.length),
        extractor: !extractorResult.error && Boolean(extractorResult.data?.length),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id, admin]);

  const pathname = location.pathname;
  const loadingMode = pathname.startsWith('/app') || pathname.startsWith('/escolher-produto') ? 'light' : 'standard';

  if (isLoading) return <AppLoadingScreen mode={loadingMode} />;
  if (!user) return <Navigate to="/login" replace state={{ from: pathname }} />;

  if (requiredRole === 'admin') {
    if (!admin) return <Navigate to="/dashboard" replace />;
    return children;
  }

  if (admin) return <Navigate to="/admin" replace />;
  if (access === null) return <AppLoadingScreen mode={loadingMode} />;

  if (pathname.startsWith('/escolher-produto') && user.email?.trim().toLowerCase() !== 'wsteste@gmail.com') {
    return <Navigate to="/dashboard" replace />;
  }

  if (pathname.startsWith('/extrator') && !access.extractor) {
    return <Navigate to="/dashboard" replace />;
  }

  if (pathname.startsWith('/app') && !access.saas) {
    return <Navigate to="/dashboard" replace />;
  }

  if (pathname.startsWith('/client') && (access.saas || access.extractor)) {
    return <Navigate to={access.saas ? '/app' : '/extrator'} replace />;
  }

  return children;
};

export default PrivateRoute;
