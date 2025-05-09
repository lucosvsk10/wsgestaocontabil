
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { checkIsAdmin } from "@/utils/auth/userChecks";

interface PrivateRouteProps {
  children: JSX.Element;
  requiredRole?: string;
}

const PrivateRoute = ({ children, requiredRole }: PrivateRouteProps) => {
  const { user, userData, isLoading } = useAuth();
  
  const isAdmin = () => {
    return checkIsAdmin(userData, user?.email);
  };

  // While loading, show a loading indicator
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // If admin role is required but user is not admin, redirect to client area
  if (requiredRole === 'admin' && !isAdmin()) {
    return <Navigate to="/client" replace />;
  }
  
  // If user is admin but accessing client page, redirect to admin area
  if (!requiredRole && isAdmin()) {
    return <Navigate to="/admin" replace />;
  }
  
  // If everything is ok, render the child component
  return children;
};

export default PrivateRoute;
