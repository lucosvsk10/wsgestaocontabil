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
  const { toggleSidebar } = useSidebarToggle({ isMobile, sidebarOpen, setSidebarOpen });

  return (
    <div className="flex min-h-screen bg-[#f4f4f2] text-[#202124] dark:bg-[#0c0d0f] dark:text-[#ececea]">
      <AdminSidebar open={sidebarOpen} onClose={handleSidebarClose} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

        {isMobile && sidebarOpen && (
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-30 bg-black/55"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-[1560px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            {children}
          </div>
        </main>
      </div>
      <NotificationPopupContainer />
    </div>
  );
};
