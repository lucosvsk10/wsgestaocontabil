
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

interface PrivateRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const PrivateRoute = ({ children, requireAdmin = false }: PrivateRouteProps) => {
  const { user, isLoading, isAdmin } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState<boolean | null>(null);

  useEffect(() => {
    // If we have user data from context, use it
    if (!isLoading) {
      console.log("PrivateRoute: Auth status loaded from context", {user: !!user, isAdmin});
      setIsAuthenticated(!!user);
      setHasAdminAccess(isAdmin);
      return;
    }
    
    // Otherwise, check localStorage while context is loading
    const storedUser = localStorage.getItem('user');
    const storedIsAdmin = localStorage.getItem('isAdmin') === 'true';
    
    if (storedUser) {
      console.log("PrivateRoute: Using stored auth data", {storedUser: !!storedUser, storedIsAdmin});
      setIsAuthenticated(true);
      setHasAdminAccess(storedIsAdmin);
    } else {
      console.log("PrivateRoute: No stored auth data found");
      setIsAuthenticated(false);
      setHasAdminAccess(false);
    }
  }, [isLoading, user, isAdmin]);

  // Still loading both context and localStorage check
  if (isAuthenticated === null) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
    </div>;
  }

  // Not authenticated
  if (!isAuthenticated) {
    console.log("PrivateRoute: Not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // Requires admin but user is not admin
  if (requireAdmin && !hasAdminAccess) {
    console.log("PrivateRoute: User not admin, redirecting to client");
    return <Navigate to="/client" replace />;
  }

  console.log("PrivateRoute: Authenticated and authorized, rendering children");
  return <>{children}</>;
};

export default PrivateRoute;
