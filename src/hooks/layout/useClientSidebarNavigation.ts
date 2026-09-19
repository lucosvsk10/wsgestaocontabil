import { Home, FileText, MessageSquareText, CalendarDays, Wrench, Building2, LucideIcon } from "lucide-react";

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
  const items = [
    { icon: Home, label: "Início", id: "overview" },
    { icon: FileText, label: "Documentos", id: "documents" },
    { icon: CalendarDays, label: "Obrigações", id: "calendar" },
    { icon: MessageSquareText, label: "Comunicados", id: "announcements" },
    { icon: Wrench, label: "Ferramentas", id: "simulations" },
    { icon: Building2, label: "Minha empresa", id: "company" },
  ];

  const sidebarItems: SidebarItem[] = items.map(item => ({
    ...item,
    active: activeTab === item.id,
  }));

  const handleItemClick = (itemId: string) => {
    setActiveTab(itemId);
    if (isMobile) onOpenChange(false);
  };

  return { sidebarItems, handleItemClick };
};
