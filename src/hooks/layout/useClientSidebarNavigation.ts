
import { FileText, Calculator, Bell, Calendar, Building2, Upload, LucideIcon } from "lucide-react";

interface SidebarItem {
  icon: LucideIcon;
  label: string;
  id: string;
  active: boolean;
}

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
  const sidebarItems: SidebarItem[] = [
    {
      icon: FileText,
      label: "Documentos",
      id: "documents",
      active: activeTab === "documents"
    },
    {
      icon: Upload,
      label: "Envio de Documentos",
      id: "monthly-upload",
      active: activeTab === "monthly-upload"
    },
    {
      icon: FileText,
      label: "Histórico de Lançamentos",
      id: "upload-history",
      active: activeTab === "upload-history"
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
