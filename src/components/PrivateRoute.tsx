import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { checkIsAdmin } from '@/utils/auth/userChecks';
import AppLoadingScreen from '@/components/AppLoadingScreen';
import { getCurrentProductAccess, type ProductAccess } from '@/utils/auth/productAccess';

interface PrivateRouteProps {
  children: JSX.Element;
  requiredRole?: string;
}

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
    getCurrentProductAccess()
      .then((nextAccess) => {
        if (!cancelled) setAccess(nextAccess);
      })
      .catch(() => {
        if (!cancelled) setAccess({ saas: false, extractor: false });
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
    return <Navigate to="/assinar?product=extractor&plan=extractor_commercial" replace />;
  }

  if (pathname.startsWith('/app') && !access.saas) {
    return <Navigate to="/assinar?product=issuer&plan=issuer_monthly" replace />;
  }

  if (pathname.startsWith('/client') && (access.saas || access.extractor)) {
    return <Navigate to={access.saas ? '/app' : '/extrator'} replace />;
  }

  return children;
};

export default PrivateRoute;
