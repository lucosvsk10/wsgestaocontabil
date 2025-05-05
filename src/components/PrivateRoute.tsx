
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRoles: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  requiredRoles = ["client"],
}) => {
  const { user, role } = useAuth();

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  // If user is authenticated, check their role
  if (requiredRoles.length > 0 && role && !requiredRoles.includes(role)) {
    // If user doesn't have the required role, redirect to appropriate page
    if (role === "admin") {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/client" replace />;
    }
  }

  // If authenticated and has required role, render the protected component
  return <>{children}</>;
};

export default PrivateRoute;
