
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export const useAdminLayout = () => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Ajustar sidebar baseado no tamanho da tela
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return {
    isMobile,
    sidebarOpen,
    setSidebarOpen,
    handleSidebarClose,
    toggleSidebar
  };
};
