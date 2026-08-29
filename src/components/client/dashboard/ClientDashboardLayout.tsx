import { useClientDashboardLayout } from "@/hooks/layout/useClientDashboardLayout";
import { useSidebarToggle } from "@/hooks/layout/useSidebarToggle";
import ClientSidebar from "../layout/ClientSidebar";
import ClientHeader from "../layout/ClientHeader";
import { Button } from "@/components/ui/button";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";

interface ClientDashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const ClientDashboardLayout = ({ children, activeTab, setActiveTab }: ClientDashboardLayoutProps) => {
  const { isMobile, sidebarOpen, setSidebarOpen } = useClientDashboardLayout();
  const { toggleSidebar, getToggleButtonProps } = useSidebarToggle({ isMobile, sidebarOpen, setSidebarOpen });
  const toggleButtonProps = getToggleButtonProps();

  return <div className="pro-ui flex min-h-screen overflow-hidden bg-transparent">
    <ClientSidebar activeTab={activeTab} setActiveTab={setActiveTab} open={sidebarOpen} onOpenChange={setSidebarOpen} />
    <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
      <ClientHeader />
      {isMobile ? <Button variant="ghost" size="icon" className={toggleButtonProps.className} onClick={toggleSidebar} data-sidebar-toggle="true" aria-label={toggleButtonProps["aria-label"]}><Menu size={20} /></Button> : <Button variant="ghost" size="icon" className={toggleButtonProps.className} onClick={toggleSidebar} aria-label={toggleButtonProps["aria-label"]}>{sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}</Button>}
      {isMobile && sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50" onClick={() => setSidebarOpen(false)} />}
      <main data-client-surface="page" className="flex-1 overflow-y-auto">
        <div className="client-stage5-shell">{children}</div>
      </main>
    </div>
  </div>;
};
