import { ReactNode } from 'react';
import { useAdminLayout } from '@/hooks/layout/useAdminLayout';
import { useSidebarToggle } from '@/hooks/layout/useSidebarToggle';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { NotificationPopupContainer } from '@/components/notifications/NotificationPopupContainer';

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { isMobile, sidebarOpen, setSidebarOpen, handleSidebarClose } = useAdminLayout();

  const { toggleSidebar } = useSidebarToggle({
    isMobile,
    sidebarOpen,
    setSidebarOpen,
  });

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-[#152033] dark:bg-[#07101f] dark:text-slate-100 flex">
      <AdminSidebar open={sidebarOpen} onClose={handleSidebarClose} />
      <div className="min-w-0 flex-1 flex flex-col">
        <AdminHeader
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
        />

        {/* Overlay para mobile quando sidebar está aberta */}
        {isMobile && sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />
        )}

        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>

      {/* Container de Pop-ups de Notificações para Admins */}
      <NotificationPopupContainer />
    </div>
  );
};
