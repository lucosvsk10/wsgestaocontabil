
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

  return <div className="min-h-screen bg-gray-50 dark:bg-deepNavy text-gray-800 dark:text-gray-200 flex overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar open={sidebarOpen} onClose={toggleSidebar} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AdminHeader />
        
        {/* Sidebar toggle button - visible all times */}
        <Button 
          variant="secondary" 
          size="icon" 
          className="fixed bottom-4 left-4 z-50 bg-white dark:bg-transparent dark:border-gold/30 shadow-md rounded-full h-10 w-10" 
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Recolher menu lateral" : "Expandir menu lateral"}
        >
          {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </Button>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-deepNavy">
          {children}
        </main>
      </div>
    </div>;
};

export default AdminLayout;
