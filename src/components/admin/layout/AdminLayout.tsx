
import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  return (
    <div className="min-h-screen bg-[#FFF1DE] dark:bg-[#020817] flex overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AdminHeader />
        
        {/* Mobile sidebar toggle button */}
        {isMobile && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="fixed top-4 left-4 z-50 rounded-full w-12 h-12 transition-all duration-300 ease-in-out hover:scale-105 bg-white/90 dark:bg-[#020817]/90 border border-[#e6e6e6] dark:border-[#efc349] hover:bg-gray-50 dark:hover:bg-[#efc349]/10 backdrop-blur-sm shadow-lg" 
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
            className="fixed bottom-8 left-8 z-50 rounded-full w-12 h-12 transition-all duration-300 ease-in-out hover:scale-105 bg-white/90 dark:bg-[#020817]/90 border border-[#e6e6e6] dark:border-[#efc349] hover:bg-gray-50 dark:hover:bg-[#efc349]/10 backdrop-blur-sm shadow-lg" 
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Recolher menu lateral" : "Expandir menu lateral"}
          >
            {sidebarOpen ? 
              <ChevronLeft size={20} className="text-[#020817] dark:text-[#efc349]" /> : 
              <ChevronRight size={20} className="text-[#020817] dark:text-[#efc349]" />
            }
          </Button>
        )}
        
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
