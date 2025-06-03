import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText, Calculator, Bell, Calendar, Building2, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
interface ClientSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export const ClientSidebar = ({
  activeTab,
  setActiveTab,
  open,
  onOpenChange
}: ClientSidebarProps) => {
  const isMobile = useIsMobile();
  const menuItems = [{
    id: "documents",
    label: "Documentos",
    icon: FileText
  }, {
    id: "simulations",
    label: "Simulações",
    icon: Calculator
  }, {
    id: "announcements",
    label: "Comunicados",
    icon: Bell
  }, {
    id: "calendar",
    label: "Agenda",
    icon: Calendar
  }, {
    id: "company",
    label: "Empresa",
    icon: Building2
  }];
  return <>
      {/* Overlay for mobile */}
      {isMobile && open && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => onOpenChange(false)} />}

      {/* Sidebar */}
      <div className={cn("fixed left-0 top-0 h-full bg-white dark:bg-[#0b1320] border-r border-gray-200 dark:border-[#efc349]/20 transition-all duration-300 z-50", open ? "w-64" : "w-16", isMobile && !open ? "-translate-x-full" : "translate-x-0")}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#efc349]/20">
          {open && <h2 className="text-[#020817] dark:text-white font-thin text-2xl">Minha Àrea </h2>}
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(!open)} className="text-[#020817] dark:text-[#efc349] hover:bg-gray-100 dark:hover:bg-[#efc349]/10">
            {isMobile ? open ? <X size={20} /> : <Menu size={20} /> : open ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </Button>
        </div>

        {/* Menu Items */}
        <nav className="p-4 space-y-2">
          {menuItems.map(item => <Button key={item.id} variant={activeTab === item.id ? "default" : "ghost"} className={cn("w-full justify-start font-extralight transition-all", open ? "px-4" : "px-2", activeTab === item.id ? "bg-[#efc349] text-[#020817] hover:bg-[#efc349]/90" : "text-[#020817] dark:text-white hover:bg-gray-100 dark:hover:bg-[#efc349]/10")} onClick={() => {
          setActiveTab(item.id);
          if (isMobile) onOpenChange(false);
        }}>
              <item.icon className={cn("h-5 w-5", open ? "mr-3" : "mx-auto")} />
              {open && <span>{item.label}</span>}
            </Button>)}
        </nav>
      </div>
    </>;
};