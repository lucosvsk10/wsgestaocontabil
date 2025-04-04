
import { Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute from "@/components/PrivateRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ClientLogin from "./pages/ClientLogin";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import ClientDashboard from "./pages/ClientDashboard";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<ClientLogin />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin" element={
        <PrivateRoute requireAdmin={true}>
          <AdminDashboard />
        </PrivateRoute>
      } />
      <Route path="/client" element={
        <PrivateRoute>
          <ClientDashboard />
        </PrivateRoute>
      } />
      {/* Redirect routes */}
      <Route path="/minha-area" element={<Navigate to="/client" replace />} />
      <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
