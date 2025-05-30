
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
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
      <Router>
        <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#020817]">
          <AppRoutes />
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
