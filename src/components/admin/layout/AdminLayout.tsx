import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { MenuIcon } from "lucide-react";
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
  return <div className="min-h-screen bg-[#F9FAFB] dark:bg-navy-deeper text-[#212121] dark:text-[#E0E0E0] flex overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar open={sidebarOpen} onClose={toggleSidebar} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AdminHeader />
        
        {/* Mobile sidebar toggle button */}
        {isMobile && <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 bg-white dark:bg-navy-medium shadow-md rounded-full border border-gray-200 dark:border-navy-lighter/50" onClick={toggleSidebar} aria-label={sidebarOpen ? "Fechar menu lateral" : "Abrir menu lateral"}>
            <MenuIcon size={20} />
          </Button>}
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F9FAFB] dark:bg-navy-dark">
          {children}
        </main>
      </div>
    </div>;
};
export default AdminLayout;