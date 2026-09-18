import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSidebarHandlers } from '@/hooks/layout/useSidebarHandlers';
import { useAdminSidebarNavigation } from '@/hooks/layout/useAdminSidebarNavigation';
import { LockKeyhole, PanelsTopLeft, Settings2, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { type LucideIcon } from 'lucide-react';
import { AdminEnvironmentSwitcher } from './AdminEnvironmentSwitcher';
import { getAdminEnvironment } from '@/config/adminEnvironments';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  to: string;
  accent: string;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  active,
  to,
  accent,
  onClick,
}) => (
  <Link
    to={to}
    className={`group flex items-center gap-3 rounded-md border-l-2 px-4 py-2.5 transition-colors duration-200 ${
      active
        ? 'bg-muted text-foreground'
        : 'border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground'
    }`}
    style={active ? { borderLeftColor: accent } : undefined}
    onClick={onClick}
  >
    <Icon size={17} strokeWidth={1.75} />
    <span className="text-sm font-medium tracking-tight">{label}</span>
  </Link>
);

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ open, onClose }) => {
  const { theme } = useTheme();
  const { sidebarSections, currentPath, environment } = useAdminSidebarNavigation();
  const currentEnvironment = getAdminEnvironment(environment);
  useSidebarHandlers({ isMobile: window.innerWidth < 768, open, onClose });

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile && open) onClose();
  }, [currentPath, onClose, open]);

  const isMobile = window.innerWidth < 768;
  const expanded = open || isMobile;

  return (
    <aside
      data-sidebar="true"
      data-environment={environment}
      className={`${
        isMobile ? 'fixed' : 'sticky top-0 h-screen self-start shrink-0'
      } inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border/60 bg-background text-foreground transition-all duration-300 ease-in-out ${
        isMobile
          ? open
            ? 'translate-x-0 shadow-2xl'
            : '-translate-x-full'
          : open
            ? 'translate-x-0'
            : '-translate-x-0 md:w-20 md:translate-x-0'
      }`}
    >
      {isMobile && open && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 text-muted-foreground hover:text-foreground"
        >
          <X size={18} />
        </Button>
      )}

      <div className="flex h-20 shrink-0 items-center justify-center border-b border-border/60 px-5">
        <Link to="/" className="flex items-center justify-center transition-opacity hover:opacity-85">
          {expanded ? (
            <img
              src={
                theme === 'light'
                  ? '/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png'
                  : '/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png'
              }
              alt="WS Gestão Contábil"
              className="h-7"
            />
          ) : (
            <img
              src={
                theme === 'light'
                  ? '/lovable-uploads/83322e23-9ed8-4622-8631-8022a1d10c19.png'
                  : '/lovable-uploads/ed055b1a-ba3e-4890-b78d-1d83e85b592b.png'
              }
              alt="WS Gestão Contábil"
              className="h-8"
            />
          )}
        </Link>
      </div>

      <div className={`shrink-0 border-b border-border/60 py-3 ${
        expanded ? '' : 'px-1'
      }`}>
        <AdminEnvironmentSwitcher environment={environment} compact={!expanded} />
      </div>

      <nav className={`flex-1 overflow-y-auto px-3 py-4 ${
        expanded ? 'space-y-5' : 'space-y-3'
      }`}>
        {sidebarSections.map((section, sectionIndex) => (
          <section
            key={section.title}
            className={!expanded && sectionIndex > 0 ? 'border-t border-border/60 pt-3' : undefined}
          >
            {expanded && (
              <p className="mb-2 px-4 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map(item => {
                const isLaunches = item.to === '/admin/lancamentos';
                const keepOpen = currentPath.startsWith('/admin/lancamentos');
                return (
                  <div key={item.label} className={isLaunches ? 'group/lancamentos' : undefined}>
                    {expanded ? (
                      <SidebarItem
                        icon={item.icon}
                        label={item.label}
                        active={item.active}
                        to={item.to}
                        accent={currentEnvironment.accent}
                        onClick={isMobile ? onClose : undefined}
                      />
                    ) : (
                      <div
                        className={`flex justify-center rounded-lg p-3 transition-colors ${
                          item.active ? 'bg-muted text-foreground' : 'hover:bg-muted/60'
                        }`}
                        title={item.label}
                      >
                        <Link
                          to={item.to}
                          className={
                            item.active
                              ? 'text-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          }
                        >
                          <item.icon
                            size={19}
                            style={item.active ? { color: currentEnvironment.accent } : undefined}
                          />
                        </Link>
                      </div>
                    )}

                    {isLaunches && expanded && (
                      <div
                        className={`ml-7 overflow-hidden border-l border-border pl-3 transition-all duration-200 ${
                          keepOpen
                            ? 'mt-1 max-h-44 opacity-100'
                            : 'max-h-0 opacity-0 group-hover/lancamentos:mt-1 group-hover/lancamentos:max-h-44 group-hover/lancamentos:opacity-100'
                        }`}
                      >
                        {[
                          ['Lançamentos mensais', '/admin/lancamentos'],
                          ['Balancete', '/admin/lancamentos/balancete'],
                          ['Plano de contas', '/admin/lancamentos/plano-contas'],
                        ].map(([label, to]) => (
                          <Link
                            key={to}
                            to={to}
                            onClick={isMobile ? onClose : undefined}
                            className={`block rounded-sm px-3 py-2 text-xs transition-colors ${
                              currentPath === to
                                ? 'bg-muted font-medium text-foreground'
                                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                            }`}
                          >
                            {label}
                          </Link>
                        ))}
                        <Link
                          to="/admin/lancamentos/engine"
                          onClick={isMobile ? onClose : undefined}
                          className={`flex items-center justify-between rounded-sm px-3 py-2 text-xs transition-colors ${
                            currentPath === '/admin/lancamentos/engine'
                              ? 'bg-muted font-medium text-foreground'
                              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Settings2 className="h-3.5 w-3.5" />
                            Engine
                          </span>
                          <LockKeyhole className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border/60 p-3">
        {expanded ? (
          <Link
            to="/admin/ambientes"
            onClick={isMobile ? onClose : undefined}
            className="flex items-center gap-3 rounded-md px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <PanelsTopLeft size={17} strokeWidth={1.75} />
            <span>Central de ambientes</span>
          </Link>
        ) : (
          <Link
            to="/admin/ambientes"
            className="flex justify-center rounded-lg p-3 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            title="Central de ambientes"
          >
            <PanelsTopLeft size={19} />
          </Link>
        )}
      </div>
    </aside>
  );
};

export default AdminSidebar;
