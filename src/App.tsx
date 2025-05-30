
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { Toaster } from './components/ui/toaster';
import AppRoutes from './AppRoutes';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Force dark mode on app load
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#020817]">
            <AppRoutes />
            <Toaster />
          </div>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
