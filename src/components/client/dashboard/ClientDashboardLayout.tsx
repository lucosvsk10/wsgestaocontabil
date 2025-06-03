
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { ClientSidebar } from "../layout/ClientSidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface ClientDashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const ClientDashboardLayout = ({ children, activeTab, setActiveTab }: ClientDashboardLayoutProps) => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  return (
    <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#020817] text-[#020817] dark:text-white font-extralight">
      {/* Mobile menu button */}
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-white/80 dark:bg-[#020817]/80 border border-gray-200 dark:border-[#efc349]/30"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={20} className="text-[#020817] dark:text-[#efc349]" />
        </Button>
      )}

      <ClientSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
      />

      <main 
        className={`transition-all duration-300 ${
          sidebarOpen && !isMobile ? 'ml-64' : isMobile ? 'ml-0' : 'ml-16'
        }`}
      >
        <div className="container mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};
