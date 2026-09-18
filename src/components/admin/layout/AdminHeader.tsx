import ThemeToggle from '@/components/ThemeToggle';
import AccountDrawer from '@/components/account/AccountDrawer';
import { AdminCompanySelector } from './AdminCompanySelector';
import { useAdminSidebarNavigation } from '@/hooks/layout/useAdminSidebarNavigation';
import { getAdminEnvironment } from '@/config/adminEnvironments';

interface AdminHeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const AdminHeader = (_props: AdminHeaderProps) => {
  const { environment } = useAdminSidebarNavigation();
  const currentEnvironment = getAdminEnvironment(environment);

  return (
    <header className="relative flex h-20 shrink-0 items-center border-b border-border/60 bg-background px-4 text-foreground transition-colors sm:px-5 lg:px-6">
      <div className="hidden flex-1 lg:block" />
      <div className="min-w-0 flex-1 lg:flex lg:justify-center">
        <AdminCompanySelector />
      </div>
      <div className="flex flex-1 shrink-0 items-center justify-end gap-2">
        <ThemeToggle />
        <AccountDrawer
          accessLabel={`Administrador · ${currentEnvironment.shortLabel}`}
          planLabel={currentEnvironment.title}
          usageRows={[{ label: 'Ambiente', value: currentEnvironment.shortLabel }]}
        />
      </div>
    </header>
  );
};

export default AdminHeader;
