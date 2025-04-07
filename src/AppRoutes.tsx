
import { Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ClientLogin from "./pages/ClientLogin";
import PrivateRoute from "./components/PrivateRoute";
import { useAuth } from "./contexts/AuthContext";
import AdminDashboard from "./pages/AdminDashboard";
import ClientDashboard from "./pages/ClientDashboard";

const AppRoutes = () => {
  const { userData, user } = useAuth();
  
  const isAdmin = () => {
    return userData?.role === 'admin' || 
           user?.email === 'wsgestao@gmail.com' || 
           user?.email === 'l09022007@gmail.com';
  };

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<ClientLogin />} />
      
      {/* Rota protegida para área de administrador */}
      <Route path="/admin" element={
        <PrivateRoute requiredRole="admin">
          <AdminDashboard />
        </PrivateRoute>
      } />
      
      {/* Rota protegida para área de cliente */}
      <Route path="/client" element={
        <PrivateRoute>
          <ClientDashboard />
        </PrivateRoute>
      } />
      
      {/* Rota para redirecionamento após login */}
      <Route path="/dashboard" element={
        <PrivateRoute>
          {isAdmin() ? <Navigate to="/admin" replace /> : <Navigate to="/client" replace />}
        </PrivateRoute>
      } />
      
      {/* Rota para capturar URLs não encontradas */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
