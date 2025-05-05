
import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ClientLogin from "./pages/ClientLogin";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import PrivateRoute from "./components/PrivateRoute";
import NotificationsHistory from "./pages/NotificationsHistory";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<ClientLogin />} />
      <Route path="*" element={<NotFound />} />
      
      {/* Protected Routes */}
      <Route
        path="/admin/*"
        element={
          <PrivateRoute requiredRoles={["admin"]}>
            <AdminDashboard />
          </PrivateRoute>
        }
      />
      
      <Route
        path="/client"
        element={
          <PrivateRoute requiredRoles={["client", "admin"]}>
            <ClientDashboard />
          </PrivateRoute>
        }
      />
      
      {/* New notifications history route */}
      <Route
        path="/notifications"
        element={
          <PrivateRoute requiredRoles={["client", "admin"]}>
            <NotificationsHistory />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
