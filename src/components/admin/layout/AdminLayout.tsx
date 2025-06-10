
import { ReactNode, useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { NotificationPopupContainer } from "@/components/notifications/NotificationPopupContainer";

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#020817] flex">
      <AdminSidebar open={sidebarOpen} onClose={handleSidebarClose} />
      <div className="flex-1 flex flex-col">
        <AdminHeader />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      
      {/* Container de Pop-ups de Notificações para Admins */}
      <NotificationPopupContainer />
    </div>
  );
};
