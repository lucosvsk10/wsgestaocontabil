
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const PrivateRoute = ({ children, requireAdmin = false }: PrivateRouteProps) => {
  const { currentUser, userLoading, isAdmin } = useAuth();

  if (userLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
    </div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/client" />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
