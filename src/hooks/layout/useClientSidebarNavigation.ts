
import { FileText, Calculator, Bell, Calendar, Building2 } from "lucide-react";

interface UseClientSidebarNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobile: boolean;
  onOpenChange: (open: boolean) => void;
}

export const useClientSidebarNavigation = ({ 
  activeTab, 
  setActiveTab, 
  isMobile, 
  onOpenChange 
}: UseClientSidebarNavigationProps) => {
  const sidebarItems = [
    {
      icon: FileText,
      label: "Documentos",
      id: "documents",
      active: activeTab === "documents"
    },
    {
      icon: Calculator,
      label: "Simulações",
      id: "simulations",
      active: activeTab === "simulations"
    },
    {
      icon: Bell,
      label: "Comunicados",
      id: "announcements",
      active: activeTab === "announcements"
    },
    {
      icon: Calendar,
      label: "Agenda",
      id: "calendar",
      active: activeTab === "calendar"
    },
    {
      icon: Building2,
      label: "Empresa",
      id: "company",
      active: activeTab === "company"
    }
  ];

  const handleItemClick = (itemId: string) => {
    setActiveTab(itemId);
    if (isMobile) onOpenChange(false);
  };

  return {
    sidebarItems,
    handleItemClick
  };
};
