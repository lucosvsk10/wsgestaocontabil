
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
    <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#020817] flex">
      <AdminSidebar open={sidebarOpen} onClose={handleSidebarClose} />
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
            className={toggleButtonProps.className}
            onClick={toggleSidebar}
            data-sidebar-toggle="true"
            aria-label={toggleButtonProps['aria-label']}
          >
            <Menu size={20} className="text-[#020817] dark:text-[#efc349]" />
          </Button>
        )}
        
        {/* Desktop sidebar toggle button */}
        {!isMobile && (
          <Button 
            variant="ghost" 
            size="icon" 
            className={toggleButtonProps.className}
            onClick={toggleSidebar}
            aria-label={toggleButtonProps['aria-label']}
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
