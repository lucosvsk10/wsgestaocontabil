import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, useLocation } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import { Toaster } from './components/ui/toaster';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AccountingProcessingProvider } from './contexts/AccountingProcessingContext';
import { CompanySelectionProvider } from './contexts/CompanySelectionContext';
import { AnnouncementsContainer } from './components/announcements/AnnouncementsContainer';
import { WrongCompetenceImportGuard } from './components/admin/lancamentos/WrongCompetenceImportGuard';
import AppLoadingScreen from './components/AppLoadingScreen';
import React from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
    },
  },
});

function RoutedApplication() {
  const { isLoading } = useAuth();
  const { pathname } = useLocation();

  if (isLoading) {
    return <AppLoadingScreen mode={pathname.startsWith('/app') ? 'light' : 'standard'} />;
  }

  return (
    <>
      <AppRoutes />
      <AnnouncementsContainer />
      <WrongCompetenceImportGuard />
      <Toaster />
    </>
  );
}

function App() {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <CompanySelectionProvider>
              <AccountingProcessingProvider>
                <BrowserRouter>
                  <RoutedApplication />
                </BrowserRouter>
              </AccountingProcessingProvider>
            </CompanySelectionProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

export default App;
