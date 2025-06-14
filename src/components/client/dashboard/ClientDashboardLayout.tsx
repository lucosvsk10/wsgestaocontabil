
import { motion } from "framer-motion";
import { useClientDashboardLayout } from "@/hooks/layout/useClientDashboardLayout";
import { useSidebarToggle } from "@/hooks/layout/useSidebarToggle";
import ClientSidebar from "../layout/ClientSidebar";
import ClientHeader from "../layout/ClientHeader";
import { Button } from "@/components/ui/button";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";

interface ClientDashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const ClientDashboardLayout = ({ children, activeTab, setActiveTab }: ClientDashboardLayoutProps) => {
  const {
    isMobile,
    sidebarOpen,
    setSidebarOpen
  } = useClientDashboardLayout();

  const { toggleSidebar, getToggleButtonProps } = useSidebarToggle({
    isMobile,
    sidebarOpen,
    setSidebarOpen
  });

  const toggleButtonProps = getToggleButtonProps();

  return (
    <div className="min-h-screen bg-white dark:bg-[#020817] flex overflow-hidden">
      {/* Sidebar */}
      <ClientSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
      />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <ClientHeader />
        
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
        
        <main className="flex-1 overflow-y-auto bg-white dark:bg-[#020817]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};
