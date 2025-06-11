
import {
  BrowserRouter as Router,
  Routes,
  Route
} from "react-router-dom";
import Index from "@/pages/Index";
import TaxCalculator from "@/pages/TaxCalculator";
import INSSCalculator from "@/pages/INSSCalculator";
import ProLaboreCalculator from "@/pages/ProLaboreCalculator";
import ClientLogin from "@/pages/ClientLogin";
import ClientDashboard from "@/pages/ClientDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import NotFound from "@/pages/NotFound";
import PrivateRoute from "@/components/PrivateRoute";
import PollPage from "@/pages/PollPage";
import NumericalPollPage from "@/pages/NumericalPollPage";
import FormPollPage from "@/pages/FormPollPage";
import SimpleCarouselManager from "@/components/admin/carousel/SimpleCarouselManager";

function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Index />} />
        <Route path="/tax-calculator" element={<TaxCalculator />} />
        <Route path="/inss-calculator" element={<INSSCalculator />} />
        <Route path="/prolabore-calculator" element={<ProLaboreCalculator />} />
        <Route path="/client-login" element={<ClientLogin />} />
        <Route path="/poll/:id" element={<PollPage />} />
        <Route path="/numerical-poll/:id" element={<NumericalPollPage />} />
        <Route path="/form-poll/:id" element={<FormPollPage />} />
        
        {/* Client Routes */}
        <Route path="/client/*" element={
          <PrivateRoute>
            <ClientDashboard />
          </PrivateRoute>
        } />
        
        {/* Admin Routes */}
        <Route path="/admin" element={
          <PrivateRoute requiredRole="admin">
            <AdminDashboard activeTab="dashboard" />
          </PrivateRoute>
        } />
        
        {/* Simple Carousel Manager Route */}
        <Route path="/admin/carousel" element={
          <PrivateRoute requiredRole="admin">
            <SimpleCarouselManager />
          </PrivateRoute>
        } />
        
        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default AppRoutes;
