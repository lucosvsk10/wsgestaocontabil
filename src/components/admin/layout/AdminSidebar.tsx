import { Link } from 'react-router-dom';
import { useSidebarHandlers } from '@/hooks/layout/useSidebarHandlers';
import { useAdminSidebarNavigation } from '@/hooks/layout/useAdminSidebarNavigation';
import { useIsMobile } from '@/hooks/use-mobile';

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

const AdminSidebar = ({ open, onClose }: AdminSidebarProps) => {
  const { sidebarItems } = useAdminSidebarNavigation();
  const isMobile = useIsMobile();

  useSidebarHandlers({ isMobile, open, onClose });

  const primaryItems = sidebarItems.slice(0, 6);
  const secondaryItems = sidebarItems.slice(6);

  const renderItems = (items: typeof sidebarItems) =>
    items.map(item => (
      <Link
        key={item.label}
        to={item.to}
        onClick={isMobile ? onClose : undefined}
        className={`block border-l-2 px-5 py-2.5 text-[13px] transition-colors ${
          item.active
            ? 'border-[#c7a23a] bg-white/[0.06] font-medium text-white'
            : 'border-transparent text-white/58 hover:bg-white/[0.035] hover:text-white'
        }`}
      >
        {item.label}
      </Link>
    ));

  return (
    <aside
      data-sidebar="true"
      className={`${isMobile ? 'fixed' : 'relative'} inset-y-0 left-0 z-50 flex shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#111214] text-white transition-[width,transform] duration-200 ${
        isMobile
          ? open
            ? 'w-64 translate-x-0'
            : 'w-64 -translate-x-full'
          : open
            ? 'w-64'
            : 'w-0 border-r-0'
      }`}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-5">
        <Link to="/" className="block">
          <img
            src="/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png"
            alt="WS Gestão Contábil"
            className="h-7 w-auto"
          />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-5">
        <p className="px-5 pb-2 text-[10px] uppercase tracking-[0.14em] text-white/30">Operação</p>
        <div>{renderItems(primaryItems)}</div>
        <p className="px-5 pb-2 pt-7 text-[10px] uppercase tracking-[0.14em] text-white/30">Gestão</p>
        <div>{renderItems(secondaryItems)}</div>
      </nav>

      <div className="border-t border-white/10 px-5 py-4 text-[11px] text-white/35">
        Ambiente administrativo
      </div>
    </aside>
  );
};

export default AdminSidebar;
