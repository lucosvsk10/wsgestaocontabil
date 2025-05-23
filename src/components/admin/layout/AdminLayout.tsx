
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
    <div className="min-h-screen bg-[#FFF1DE] dark:bg-deepNavy flex overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar open={sidebarOpen} onClose={toggleSidebar} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AdminHeader />
        
        {/* Sidebar toggle button - visible all times */}
        <Button 
          variant="secondary" 
          size="icon" 
          className="fixed bottom-4 left-4 z-50 bg-white shadow-md rounded-full border border-[#e6e6e6] h-10 w-10 dark:border-gold dark:border-opacity-30 dark:bg-transparent" 
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Recolher menu lateral" : "Expandir menu lateral"}
        >
          {sidebarOpen ? 
            <ChevronLeft size={20} className="text-[#020817] dark:text-gold" /> : 
            <ChevronRight size={20} className="text-[#020817] dark:text-gold" />
          }
        </Button>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#FFF1DE] dark:bg-deepNavy">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
