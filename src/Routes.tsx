
import React from 'react';
import {
  BrowserRouter,
  Routes as RouterRoutes,
  Route,
  Navigate,
} from 'react-router-dom';
import ClientDashboard from './pages/ClientDashboard';
import { useAuth } from './contexts/AuthContext';
import { AdminDocumentManagementView } from './components/admin/AdminDocumentManagementView';
import AdminDashboard from './pages/AdminDashboard';

const RequireAuth = ({ children }: { children?: React.ReactNode }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <RouterRoutes>
        {/* Public routes */}
        <Route path="/login" element={<ClientLogin />} />
        <Route path="/" element={<ClientLogin />} />
        
        {/* Private routes that require authentication */}
        <Route path="/client-dashboard" element={
          <RequireAuth>
            <ClientDashboard />
          </RequireAuth>
        } />
        <Route path="/admin" element={
          <RequireAuth>
            <AdminDashboard activeTab="dashboard" />
          </RequireAuth>
        } />
        <Route path="/admin/users" element={
          <RequireAuth>
            <AdminDashboard activeTab="users" />
          </RequireAuth>
        } />
        <Route path="/admin/user-create" element={
          <RequireAuth>
            <AdminDashboard activeTab="user-create" />
          </RequireAuth>
        } />
        <Route path="/admin/user-documents/:userId" element={
          <RequireAuth>
            <AdminDashboard activeTab="user-documents" />
          </RequireAuth>
        } />
        <Route path="/admin/documents" element={
          <RequireAuth>
            <AdminDocumentManagementView />
          </RequireAuth>
        } />
        <Route path="/admin/polls" element={
          <RequireAuth>
            <AdminDashboard activeTab="polls" />
          </RequireAuth>
        } />
        <Route path="/admin/simulator" element={
          <RequireAuth>
            <AdminDashboard activeTab="simulator" />
          </RequireAuth>
        } />
        
        {/* Error route - matches any unmatched path */}
        <Route path="*" element={<Navigate to={user ? "/client-dashboard" : "/login"} replace />} />
      </RouterRoutes>
    </BrowserRouter>
  );
};

// Importação para ClientLogin
import ClientLogin from './pages/ClientLogin';

export default AppRoutes;
