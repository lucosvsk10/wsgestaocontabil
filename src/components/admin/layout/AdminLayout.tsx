
import { ReactNode } from "react";
import { useAdminLayout } from "@/hooks/layout/useAdminLayout";
import { useSidebarToggle } from "@/hooks/layout/useSidebarToggle";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { NotificationPopupContainer } from "@/components/notifications/NotificationPopupContainer";
import { Button } from "@/components/ui/button";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const {
    isMobile,
    sidebarOpen,
    setSidebarOpen,
    handleSidebarClose
  } = useAdminLayout();

  const { toggleSidebar, getToggleButtonProps } = useSidebarToggle({
    isMobile,
    sidebarOpen,
    setSidebarOpen
  });

  const toggleButtonProps = getToggleButtonProps();

  return (
    <div className="pro-ui min-h-screen bg-background text-foreground flex transition-colors duration-200">
      <AdminSidebar open={sidebarOpen} onClose={handleSidebarClose} />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
          toggleSidebar={toggleSidebar}
        />
        
        {isMobile && (
          <Button 
            variant="ghost" 
            size="icon" 
            className={toggleButtonProps.className}
            onClick={toggleSidebar}
            data-sidebar-toggle="true"
            aria-label={toggleButtonProps['aria-label']}
          >
            <Menu size={20} className="text-foreground dark:text-[#efc349]" />
          </Button>
        )}
        
        {!isMobile && (
          <Button 
            variant="ghost" 
            size="icon" 
            className={toggleButtonProps.className}
            onClick={toggleSidebar}
            aria-label={toggleButtonProps['aria-label']}
          >
            {sidebarOpen ? 
              <ChevronLeft size={20} className="text-foreground dark:text-[#efc349]" /> : 
              <ChevronRight size={20} className="text-foreground dark:text-[#efc349]" />
            }
          </Button>
        )}
        
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        <main className="flex-1 overflow-auto bg-background transition-colors duration-200">
          {children}
        </main>
      </div>
      
      <NotificationPopupContainer />
    </div>
  );
};
