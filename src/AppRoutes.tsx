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
import AdminLancamentos from "./pages/AdminLancamentos";
import AdminBalancete from "./pages/AdminBalancete";
import AdminPlanoContas from "./pages/AdminPlanoContas";
import AdminEngine from "./pages/AdminEngine";
import AdminFeature from "./pages/AdminFeature";
import AdminFiscalCompanies from "./pages/AdminFiscalCompanies";
import AdminFiscalNotes from "./pages/AdminFiscalNotes";

const AppRoutes = () => {
  const { userData, user } = useAuth();
  const isAdmin = () => checkIsAdmin(userData, user?.email);

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

      <Route path="/admin" element={<PrivateRoute requiredRole="admin"><AdminDashboard activeTab="dashboard" /></PrivateRoute>} />
      <Route path="/admin/users" element={<PrivateRoute requiredRole="admin"><AdminDashboard activeTab="users" /></PrivateRoute>} />
      <Route path="/admin/user-documents/:userId" element={<PrivateRoute requiredRole="admin"><AdminDashboard activeTab="user-documents" /></PrivateRoute>} />
      <Route path="/admin/company-data/:userId" element={<PrivateRoute requiredRole="admin"><CompanyDataView /></PrivateRoute>} />
      <Route path="/admin/storage" element={<PrivateRoute requiredRole="admin"><AdminDashboard activeTab="storage" /></PrivateRoute>} />
      <Route path="/admin/polls" element={<PrivateRoute requiredRole="admin"><AdminDashboard activeTab="polls" /></PrivateRoute>} />
      <Route path="/admin/tools" element={<PrivateRoute requiredRole="admin"><AdminDashboard activeTab="tools" /></PrivateRoute>} />
      <Route path="/admin/simulations" element={<PrivateRoute requiredRole="admin"><AdminDashboard activeTab="simulations" /></PrivateRoute>} />
      <Route path="/admin/announcements" element={<PrivateRoute requiredRole="admin"><AdminDashboard activeTab="announcements" /></PrivateRoute>} />
      <Route path="/admin/agenda" element={<PrivateRoute requiredRole="admin"><AdminDashboard activeTab="agenda" /></PrivateRoute>} />
      <Route path="/admin/settings" element={<PrivateRoute requiredRole="admin"><AdminDashboard activeTab="settings" /></PrivateRoute>} />
      <Route path="/admin/fiscal/empresas" element={<PrivateRoute requiredRole="admin"><AdminFiscalCompanies /></PrivateRoute>} />
      <Route path="/admin/feature" element={<PrivateRoute requiredRole="admin"><AdminFiscalNotes /></PrivateRoute>} />
      <Route path="/admin/fiscal/emissao" element={<PrivateRoute requiredRole="admin"><AdminFeature /></PrivateRoute>} />
      <Route path="/admin/fiscal/cte" element={<Navigate to="/admin/fiscal/emissao" replace />} />
      <Route path="/admin/fiscal/laboratorio" element={<Navigate to="/admin/fiscal/emissao" replace />} />

      <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />
      <Route path="/admin/tax-simulations" element={<Navigate to="/admin/simulations" replace />} />
      <Route path="/admin/carousel" element={<PrivateRoute requiredRole="admin"><AdminLayout><SimpleCarouselManager /></AdminLayout></PrivateRoute>} />
      <Route path="/admin/lancamentos" element={<PrivateRoute requiredRole="admin"><AdminLancamentos /></PrivateRoute>} />
      <Route path="/admin/lancamentos/balancete" element={<PrivateRoute requiredRole="admin"><AdminBalancete /></PrivateRoute>} />
      <Route path="/admin/lancamentos/plano-contas" element={<PrivateRoute requiredRole="admin"><AdminPlanoContas /></PrivateRoute>} />
      <Route path="/admin/lancamentos/engine" element={<PrivateRoute requiredRole="admin"><AdminEngine /></PrivateRoute>} />
      <Route path="/admin/lancamentos/feature" element={<Navigate to="/admin/fiscal/emissao" replace />} />

      <Route path="/client/*" element={<PrivateRoute><ClientDashboard /></PrivateRoute>} />
      <Route path="/dashboard" element={<PrivateRoute>{isAdmin() ? <Navigate to="/admin" replace /> : <Navigate to="/client" replace />}</PrivateRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;