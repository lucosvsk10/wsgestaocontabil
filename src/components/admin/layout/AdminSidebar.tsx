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
        className={`mx-3 block rounded-md border px-3 py-2.5 text-[13px] transition-colors ${
          item.active
            ? 'border-blue-500/35 bg-blue-500/12 font-semibold text-blue-100'
            : 'border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
        }`}
      >
        {item.label}
      </Link>
    ));

  return (
    <aside
      data-sidebar="true"
      className={`${isMobile ? 'fixed' : 'relative'} inset-y-0 left-0 z-50 flex shrink-0 flex-col overflow-hidden border-r border-[#20324a] bg-[#081321] text-white transition-[width,transform] duration-200 ${
        isMobile
          ? open
            ? 'w-64 translate-x-0'
            : 'w-64 -translate-x-full'
          : open
            ? 'w-64'
            : 'w-0 border-r-0'
      }`}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-[#20324a] px-5">
        <Link to="/" className="block">
          <img
            src="/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png"
            alt="WS Gestão Contábil"
            className="h-7 w-auto"
          />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-5">
        <p className="px-6 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Operação</p>
        <div className="space-y-0.5">{renderItems(primaryItems)}</div>
        <p className="px-6 pb-2 pt-7 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">Gestão</p>
        <div className="space-y-0.5">{renderItems(secondaryItems)}</div>
      </nav>

      <div className="border-t border-[#20324a] px-5 py-4 text-[11px] text-slate-500">
        <span className="mb-1 block font-semibold text-slate-400">WS Gestão Contábil</span>
        Ambiente administrativo
      </div>
    </aside>
  );
};

export default AdminSidebar;
