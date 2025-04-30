
import { Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ClientLogin from "./pages/ClientLogin";
import PrivateRoute from "./components/PrivateRoute";
import { useAuth } from "./contexts/AuthContext";
import AdminDashboard from "./pages/AdminDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import { checkIsAdmin } from "./utils/auth/userChecks";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

const AppRoutes = () => {
  const { userData, user } = useAuth();
  
  const isAdmin = () => {
    return checkIsAdmin(userData, user?.email);
  };

  return (
    <TooltipProvider>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<ClientLogin />} />
        
        {/* Protected route for admin area */}
        <Route path="/admin" element={
          <PrivateRoute requiredRole="admin">
            <AdminDashboard />
          </PrivateRoute>
        } />
        
        {/* Protected route for client area */}
        <Route path="/client" element={
          <PrivateRoute>
            <ClientDashboard />
          </PrivateRoute>
        } />
        
        {/* Route for redirection after login */}
        <Route path="/dashboard" element={
          <PrivateRoute>
            {isAdmin() ? <Navigate to="/admin" replace /> : <Navigate to="/client" replace />}
          </PrivateRoute>
        } />
        
        {/* Route for catching not found URLs */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </TooltipProvider>
  );
};

export default AppRoutes;
