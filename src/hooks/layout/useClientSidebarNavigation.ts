
import { FileText, Calculator, Bell, Calendar, Building2, Receipt, Shield, LucideIcon } from "lucide-react";

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
      icon: Receipt,
      label: "Fiscal - Dashboard",
      id: "fiscal-dashboard",
      active: activeTab === "fiscal-dashboard"
    },
    {
      icon: FileText,
      label: "Notas Fiscais",
      id: "fiscal-notes",
      active: activeTab === "fiscal-notes"
    },
    {
      icon: Shield,
      label: "Certificados",
      id: "fiscal-certificates",
      active: activeTab === "fiscal-certificates"
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
