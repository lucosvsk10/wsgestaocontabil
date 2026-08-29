import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./AppRoutes";
import { Toaster } from "./components/ui/toaster";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { AccountingProcessingProvider } from "./contexts/AccountingProcessingContext";
import { CompanySelectionProvider } from "./contexts/CompanySelectionContext";
import { AnnouncementsContainer } from "./components/announcements/AnnouncementsContainer";
import { WrongCompetenceImportGuard } from "./components/admin/lancamentos/WrongCompetenceImportGuard";
import React from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
    },
  },
});

function App() {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <CompanySelectionProvider>
              <AccountingProcessingProvider>
                <BrowserRouter>
                  <AppRoutes />
                  <AnnouncementsContainer />
                  <WrongCompetenceImportGuard />
                  <Toaster />
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