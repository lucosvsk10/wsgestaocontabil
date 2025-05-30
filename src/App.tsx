
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from './components/ui/toaster';
import AppRoutes from './AppRoutes';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Force dark mode on app load
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#020817]">
            <AppRoutes />
            <Toaster />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
