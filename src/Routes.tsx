import React, { useContext } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import ClientDashboard from './pages/ClientDashboard';
import ClientProfile from './pages/ClientProfile';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import { AuthContext } from './contexts/AuthContext';
import PollView from './pages/PollView';
import PollCreation from './pages/PollCreation';
import PollRespond from './pages/PollRespond';
import { AdminDocumentManagementView } from './components/admin/AdminDocumentManagementView';

const RequireAuth = ({ children }: { children?: React.ReactNode }) => {
  const { user } = useContext(AuthContext);
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const Routes = () => {
  const { user } = useContext(AuthContext);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Login />} />
        
        {/* Private routes that require authentication */}
        <Route element={<RequireAuth />}>
          <Route path="/client-dashboard" element={<ClientDashboard />} />
          <Route path="/client-profile" element={<ClientProfile />} />
          <Route path="/admin" element={<AdminDashboard activeTab="dashboard" />} />
          <Route path="/admin/users" element={<AdminDashboard activeTab="users" />} />
          <Route path="/admin/user-create" element={<AdminDashboard activeTab="user-create" />} />
          <Route path="/admin/user-documents/:userId" element={<AdminDashboard activeTab="user-documents" />} />
          <Route path="/admin/documents" element={<AdminDocumentManagementView />} />
          <Route path="/admin/polls" element={<AdminDashboard activeTab="polls" />} />
          <Route path="/admin/simulator" element={<AdminDashboard activeTab="simulator" />} />
          <Route path="/polls/view/:id" element={<PollView />} />
          <Route path="/polls/create" element={<PollCreation />} />
          <Route path="/polls/respond/:id" element={<PollRespond />} />
        </Route>
        
        {/* Error route - matches any unmatched path */}
        <Route path="*" element={<Navigate to={user ? "/client-dashboard" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Routes;
