import { Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ClientLogin from "./pages/ClientLogin";
import PrivateRoute from "./components/PrivateRoute";
import { useAuth } from "./contexts/AuthContext";
import AdminDashboard from "./pages/AdminDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import PollPage from "./pages/PollPage";
import NumericalPollPage from "./pages/NumericalPollPage";
import FormPollPage from "./pages/FormPollPage";
import TaxCalculator from "./pages/TaxCalculator";
import INSSCalculator from "./pages/INSSCalculator";
import ProLaboreCalculator from "./pages/ProLaboreCalculator";
import ChangeLog from "./pages/ChangeLog";
import { checkIsAdmin } from "./utils/auth/userChecks";
import { CompanyDataView } from "./components/admin/company/CompanyDataView";
import SimpleCarouselManager from '@/components/admin/carousel/SimpleCarouselManager';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import DocumentHistoryPage from "./pages/DocumentHistoryPage";
import { AdminUploadHistory } from "./components/admin/AdminUploadHistory";

const AppRoutes = () => {
  const { userData, user } = useAuth();
  
  const isAdmin = () => {
    return checkIsAdmin(userData, user?.email);
  };

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<ClientLogin />} />
      <Route path="/enquete/:id" element={<PollPage />} />
      <Route path="/enquete-numerica/:id" element={<NumericalPollPage />} />
      <Route path="/formulario/:id" element={<FormPollPage />} />
      <Route path="/simulador-irpf" element={<TaxCalculator />} />
      <Route path="/calculadora-inss" element={<INSSCalculator />} />
      <Route path="/simulador-prolabore" element={<ProLaboreCalculator />} />
      <Route path="/changelog" element={<ChangeLog />} />
      
      {/* Admin routes */}
      <Route path="/admin" element={
        <PrivateRoute requiredRole="admin">
          <AdminDashboard activeTab="dashboard" />
        </PrivateRoute>
      } />
      
      <Route path="/admin/users" element={
        <PrivateRoute requiredRole="admin">
          <AdminDashboard activeTab="users" />
        </PrivateRoute>
      } />
      
      <Route path="/admin/user-documents/:userId" element={
        <PrivateRoute requiredRole="admin">
          <AdminDashboard activeTab="user-documents" />
        </PrivateRoute>
      } />

      <Route path="/admin/company-data/:userId" element={
        <PrivateRoute requiredRole="admin">
          <CompanyDataView />
        </PrivateRoute>
      } />
      
      <Route path="/admin/storage" element={
        <PrivateRoute requiredRole="admin">
          <AdminDashboard activeTab="storage" />
        </PrivateRoute>
      } />
      
      <Route path="/admin/polls" element={
        <PrivateRoute requiredRole="admin">
          <AdminDashboard activeTab="polls" />
        </PrivateRoute>
      } />
      
      <Route path="/admin/tools" element={
        <PrivateRoute requiredRole="admin">
          <AdminDashboard activeTab="tools" />
        </PrivateRoute>
      } />
      
      <Route path="/admin/simulations" element={
        <PrivateRoute requiredRole="admin">
          <AdminDashboard activeTab="simulations" />
        </PrivateRoute>
      } />
      
      <Route path="/admin/announcements" element={
        <PrivateRoute requiredRole="admin">
          <AdminDashboard activeTab="announcements" />
        </PrivateRoute>
      } />
      
      <Route path="/admin/agenda" element={
        <PrivateRoute requiredRole="admin">
          <AdminDashboard activeTab="agenda" />
        </PrivateRoute>
      } />
      
      <Route path="/admin/settings" element={
        <PrivateRoute requiredRole="admin">
          <AdminDashboard activeTab="settings" />
        </PrivateRoute>
      } />
      
      {/* Manter compatibilidade com rotas antigas */}
      <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />
      <Route path="/admin/tax-simulations" element={<Navigate to="/admin/simulations" replace />} />
      
      {/* Nova rota simplificada do carousel */}
      <Route 
        path="/admin/carousel" 
        element={
          <PrivateRoute requiredRole="admin">
            <AdminLayout>
              <SimpleCarouselManager />
            </AdminLayout>
          </PrivateRoute>
        } 
      />
      
      {/* Histórico de Lançamentos - Admin */}
      <Route 
        path="/admin/document-history" 
        element={
          <PrivateRoute requiredRole="admin">
            <AdminLayout>
              <DocumentHistoryPage />
            </AdminLayout>
          </PrivateRoute>
        } 
      />

      {/* Histórico Geral - Todos os Usuários (Admin) */}
      <Route 
        path="/admin/upload-history" 
        element={
          <PrivateRoute requiredRole="admin">
            <AdminLayout>
              <AdminUploadHistory />
            </AdminLayout>
          </PrivateRoute>
        } 
      />
      
      {/* Client routes */}
      <Route path="/client/*" element={
        <PrivateRoute>
          <ClientDashboard />
        </PrivateRoute>
      } />
      
      {/* Redirect route after login */}
      <Route path="/dashboard" element={
        <PrivateRoute>
          {isAdmin() ? <Navigate to="/admin" replace /> : <Navigate to="/client" replace />}
        </PrivateRoute>
      } />
      
      {/* 404 route - must be last */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
