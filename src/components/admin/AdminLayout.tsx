
import { ReactNode, useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import AdminSidebar from "./layout/AdminSidebar";
import AdminHeader from "./layout/AdminHeader";
import { NotificationPopupContainer } from "@/components/notifications/NotificationPopupContainer";
import { Button } from "@/components/ui/button";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Ajustar sidebar baseado no tamanho da tela
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#020817] flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <AdminHeader 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
          toggleSidebar={toggleSidebar}
        />
        
        {/* Mobile sidebar toggle button */}
        {isMobile && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="fixed top-4 left-4 z-50 rounded-full w-12 h-12 transition-all duration-300 ease-in-out hover:scale-105 bg-white/80 dark:bg-[#020817]/80 border border-[#e6e6e6] dark:border-[#efc349] hover:bg-gray-50 dark:hover:bg-[#efc349]/10 backdrop-blur-sm" 
            onClick={toggleSidebar}
            data-sidebar-toggle="true"
            aria-label={sidebarOpen ? "Fechar menu lateral" : "Abrir menu lateral"}
          >
            <Menu size={20} className="text-[#020817] dark:text-[#efc349]" />
          </Button>
        )}
        
        {/* Desktop sidebar toggle button */}
        {!isMobile && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="fixed bottom-8 left-8 z-50 rounded-full w-12 h-12 transition-all duration-300 ease-in-out hover:scale-105 bg-white/80 dark:bg-[#020817]/80 border border-[#e6e6e6] dark:border-[#efc349] hover:bg-gray-50 dark:hover:bg-[#efc349]/10 backdrop-blur-sm" 
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Recolher menu lateral" : "Expandir menu lateral"}
          >
            {sidebarOpen ? 
              <ChevronLeft size={20} className="text-[#020817] dark:text-[#efc349]" /> : 
              <ChevronRight size={20} className="text-[#020817] dark:text-[#efc349]" />
            }
          </Button>
        )}
        
        {/* Overlay para mobile quando sidebar está aberta */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      
      {/* Container de Pop-ups de Notificações para Admins */}
      <NotificationPopupContainer />
    </div>
  );
};

export default AdminLayout;
