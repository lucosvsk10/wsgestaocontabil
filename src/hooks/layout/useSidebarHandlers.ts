
import { useEffect } from "react";

interface UseSidebarHandlersProps {
  isMobile: boolean;
  open: boolean;
  onClose: () => void;
}

export const useSidebarHandlers = ({ isMobile, open, onClose }: UseSidebarHandlersProps) => {
  // Close sidebar on outside click for mobile
  useEffect(() => {
    if (isMobile && open) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-sidebar="true"]') && !target.closest('[data-sidebar-toggle="true"]')) {
          onClose();
        }
      };
      
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isMobile, onClose, open]);

  return {};
};
