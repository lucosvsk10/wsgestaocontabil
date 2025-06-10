
import { ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { NotificationPopupContainer } from "@/components/notifications/NotificationPopupContainer";

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  return (
    <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#020817] flex">
      <AdminSidebar />
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
