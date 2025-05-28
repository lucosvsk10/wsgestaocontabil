
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Toaster } from "./components/ui/sonner";
import AppRoutes from "./AppRoutes";
import AnnouncementsContainer from "./components/announcements/AnnouncementsContainer";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider defaultTheme="system" storageKey="ws-gestao-theme">
            <div className="min-h-screen bg-[#FFF1DE] dark:bg-[#020817]">
              <AppRoutes />
              <AnnouncementsContainer />
              <Toaster />
            </div>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
