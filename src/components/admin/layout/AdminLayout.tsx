
import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children
}) => {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Toggle sidebar function
  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  // Adjust sidebar visibility based on screen size
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  return (
    <div className="min-h-screen bg-[#FFF1DE] dark:bg-[#020817] flex overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar open={sidebarOpen} onClose={toggleSidebar} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AdminHeader />
        
        {/* Sidebar toggle button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="fixed bottom-8 left-8 z-50 rounded-full w-12 h-12 transition-all duration-300 ease-in-out hover:scale-105 bg-white/10 border border-[#e6e6e6] hover:bg-gray-50 dark:bg-transparent dark:border-[#efc349] dark:hover:bg-[#efc349]/10 dark:backdrop-blur-sm" 
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Recolher menu lateral" : "Expandir menu lateral"}
        >
          {sidebarOpen ? 
            <ChevronLeft size={20} className="text-[#020817] dark:text-[#efc349]" /> : 
            <ChevronRight size={20} className="text-[#020817] dark:text-[#efc349]" />
          }
        </Button>
        
        <main className="flex-1 overflow-y-auto p-8 space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
