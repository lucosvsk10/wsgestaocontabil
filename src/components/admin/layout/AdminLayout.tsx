
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
  const {
    theme
  } = useTheme();
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
        
        {/* Sidebar toggle button - visible all times */}
        <Button 
          variant="secondary" 
          size="icon" 
          className="fixed bottom-6 left-6 z-50 bg-white shadow-lg rounded-full border border-[#e6e6e6] h-12 w-12 dark:bg-transparent dark:border-[#efc349] dark:shadow-none" 
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Recolher menu lateral" : "Expandir menu lateral"}
        >
          {sidebarOpen ? 
            <ChevronLeft size={20} className="text-[#efc349]" /> : 
            <ChevronRight size={20} className="text-[#efc349]" />
          }
        </Button>
        
        <main className="flex-1 overflow-y-auto p-8 bg-[#FFF1DE] dark:bg-[#020817]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
