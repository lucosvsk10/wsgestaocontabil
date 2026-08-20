import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSidebarHandlers } from '@/hooks/layout/useSidebarHandlers';
import { useAdminSidebarNavigation } from '@/hooks/layout/useAdminSidebarNavigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  to: string;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, active, to, onClick }) => {
  return (
    <Link
      to={to}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
        active
          ? 'bg-[#efc349] text-[#101827] shadow-[0_8px_24px_rgba(239,195,73,0.18)]'
          : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
      }`}
      onClick={onClick}
    >
      <div
        className={`transition-all duration-200 ${
          active ? 'text-[#101827]' : 'text-slate-400 group-hover:text-[#efc349]'
        }`}
      >
        <Icon size={18} />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
};

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ open, onClose }) => {
  const { sidebarItems, currentPath } = useAdminSidebarNavigation();
  const isMobile = useIsMobile();

  // Use the custom hook for sidebar handlers
  useSidebarHandlers({
    isMobile,
    open,
    onClose,
  });

  // Close sidebar on route change for mobile
  useEffect(() => {
    if (isMobile && open) {
      onClose();
    }
  }, [currentPath, isMobile, onClose, open]);

  const primaryItems = sidebarItems.slice(0, 6);
  const secondaryItems = sidebarItems.slice(6);

  const renderItems = (items: typeof sidebarItems) =>
    items.map(item => (
      <div key={item.label}>
        {open || isMobile ? (
          <SidebarItem
            icon={item.icon}
            label={item.label}
            active={item.active}
            to={item.to}
            onClick={isMobile ? onClose : undefined}
          />
        ) : (
          <Link
            to={item.to}
            title={item.label}
            className={`flex justify-center rounded-xl p-3 transition-all duration-200 ${
              item.active
                ? 'bg-[#efc349] text-[#101827]'
                : 'text-slate-400 hover:bg-white/10 hover:text-[#efc349]'
            }`}
          >
            <item.icon size={19} />
          </Link>
        )}
      </div>
    ));

  return (
    <aside
      data-sidebar="true"
      className={`
        ${isMobile ? 'fixed' : 'relative'} 
        inset-y-0 left-0 z-50 
        w-72 flex flex-col 
        transition-transform duration-300 ease-in-out 
        border-r border-white/10 bg-[#0a1322] text-white shadow-[12px_0_40px_rgba(2,8,23,0.08)]
        ${
          isMobile
            ? open
              ? 'translate-x-0 shadow-2xl'
              : '-translate-x-full'
            : open
              ? 'translate-x-0'
              : '-translate-x-0 md:translate-x-0 md:w-20'
        }
      `}
    >
      {/* Mobile close button */}
      {isMobile && open && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-gray-500 dark:text-white/70 hover:text-[#efc349]"
        >
          <X size={20} />
        </Button>
      )}

      {/* Logo area */}
      <div className="flex h-[72px] items-center justify-center border-b border-white/10 px-5">
        <Link
          to="/"
          className="flex items-center justify-center transition-all duration-300 hover:scale-105"
        >
          {open || isMobile ? (
            <img
              src="/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png"
              alt="WS Gestão Contábil"
              className="h-8"
            />
          ) : (
            <img
              src="/lovable-uploads/ed055b1a-ba3e-4890-b78d-1d83e85b592b.png"
              alt="WS Gestão Contábil"
              className="h-10"
            />
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        <div className="space-y-1.5">
          {(open || isMobile) && (
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Operação
            </p>
          )}
          {renderItems(primaryItems)}
        </div>
        <div className="space-y-1.5">
          {(open || isMobile) && (
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Gestão
            </p>
          )}
          {renderItems(secondaryItems)}
        </div>
      </nav>
      {(open || isMobile) && (
        <div className="m-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#efc349]">
            WS Gestão
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">Ambiente administrativo</p>
        </div>
      )}
    </aside>
  );
};

export default AdminSidebar;
