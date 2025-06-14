
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export const useClientDashboardLayout = () => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return {
    isMobile,
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar
  };
};
