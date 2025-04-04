
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
      
      {/* Rotas protegidas com verificação de papel */}
      <Route path="/admin" element={
        <PrivateRoute requireAdmin={true}>
          <AdminDashboard />
        </PrivateRoute>
      } />
      
      <Route path="/client" element={
        <PrivateRoute requireAdmin={false}>
          <ClientDashboard />
        </PrivateRoute>
      } />
      
      {/* Rotas de redirecionamento */}
      <Route path="/minha-area" element={<Navigate to="/client" replace />} />
      <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />
      
      {/* Rota para capturar URLs não encontradas */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
