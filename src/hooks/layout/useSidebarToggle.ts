
import { useCallback } from "react";

interface UseSidebarToggleProps {
  isMobile: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useSidebarToggle = ({ isMobile, sidebarOpen, setSidebarOpen }: UseSidebarToggleProps) => {
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen, setSidebarOpen]);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  const getToggleButtonProps = useCallback(() => {
    const baseClasses = "fixed z-50 rounded-full w-12 h-12 transition-all duration-300 ease-in-out hover:scale-105 bg-white/80 dark:bg-[#020817]/80 border border-[#e6e6e6] dark:border-[#efc349] hover:bg-gray-50 dark:hover:bg-[#efc349]/10 backdrop-blur-sm";
    
    if (isMobile) {
      return {
        className: `top-4 left-4 ${baseClasses}`,
        'aria-label': sidebarOpen ? "Fechar menu lateral" : "Abrir menu lateral"
      };
    } else {
      return {
        className: `bottom-8 left-8 ${baseClasses}`,
        'aria-label': sidebarOpen ? "Recolher menu lateral" : "Expandir menu lateral"
      };
    }
  }, [isMobile, sidebarOpen]);

  return {
    toggleSidebar,
    closeSidebar,
    getToggleButtonProps
  };
};
