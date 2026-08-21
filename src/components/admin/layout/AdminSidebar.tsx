
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useSidebarHandlers } from "@/hooks/layout/useSidebarHandlers";
import { useAdminSidebarNavigation } from "@/hooks/layout/useAdminSidebarNavigation";
import { X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  to: string;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  active,
  to,
  onClick
}) => {
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-4 py-2.5 rounded-sm transition-colors duration-200 group ${
        active 
          ? "bg-muted text-foreground border-l-2 border-foreground/60" 
          : "text-muted-foreground border-l-2 border-transparent hover:bg-muted/60 hover:text-foreground"
      }`} 
      onClick={onClick}
    >
      <Icon size={18} strokeWidth={1.75} />
      <span className="text-sm font-medium tracking-tight">{label}</span>
    </Link>
  );
};

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ open, onClose }) => {
  const { theme } = useTheme();
  const { sidebarSections, currentPath } = useAdminSidebarNavigation();
  
  // Use the custom hook for sidebar handlers
  useSidebarHandlers({ 
    isMobile: window.innerWidth < 768, 
    open, 
    onClose 
  });

  // Close sidebar on route change for mobile
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile && open) {
      onClose();
    }
  }, [currentPath, onClose, open]);

  const isMobile = window.innerWidth < 768;

  return (
    <aside 
      data-sidebar="true" 
      className={`
        ${isMobile ? 'fixed' : 'sticky top-0 h-screen self-start shrink-0'}
        inset-y-0 left-0 z-50 
        w-72 flex flex-col 
        transition-transform duration-300 ease-in-out 
        bg-white dark:bg-[#020817] 
        ${isMobile 
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
      <div className="h-20 flex items-center justify-center px-6 border-b border-gray-100 dark:border-[#020817]">
        <Link to="/" className="flex items-center justify-center transition-all duration-300 hover:scale-105">
          {(open || isMobile) ? (
            <img 
              src={theme === 'light' 
                ? "/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png" 
                : "/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png"
              } 
              alt="WS Gestão Contábil" 
              className="h-8" 
            />
          ) : (
            <img 
              src={theme === 'light' 
                ? "/lovable-uploads/83322e23-9ed8-4622-8631-8022a1d10c19.png" 
                : "/lovable-uploads/ed055b1a-ba3e-4890-b78d-1d83e85b592b.png"
              } 
              alt="WS Gestão Contábil" 
              className="h-10" 
            />
          )}
        </Link>
      </div>
      
      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto px-3 py-6 ${open || isMobile ? "space-y-6" : "space-y-3"}`}>
        {sidebarSections.map((section, sectionIndex) => (
          <section
            key={section.title}
            className={
              !open && !isMobile && sectionIndex > 0
                ? "border-t border-gray-100 pt-3 dark:border-white/10"
                : undefined
            }
          >
            {(open || isMobile) && (
              <p className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
                {section.title}
              </p>
            )}

            <div className="space-y-1">
              {section.items.map(item => {
                const isLaunches = item.to === "/admin/lancamentos";
                const keepOpen = currentPath.startsWith("/admin/lancamentos");
                return (
                <div key={item.label} className={isLaunches ? "group/lancamentos" : undefined}>
                  {(open || isMobile) ? (
                    <SidebarItem
                      icon={item.icon}
                      label={item.label}
                      active={item.active}
                      to={item.to}
                      onClick={isMobile ? onClose : undefined}
                    />
                  ) : (
                    <div
                      className={`flex justify-center rounded-lg p-4 transition-all duration-300 hover:scale-110 ${
                        item.active
                          ? "bg-[#efc349]/10 border-l-4 border-[#efc349]"
                          : "hover:bg-gray-100 dark:hover:bg-[#efc349]/10"
                      }`}
                      title={item.label}
                    >
                      <Link
                        to={item.to}
                        className={`transition-colors duration-300 ${
                          item.active
                            ? "text-[#efc349]"
                            : "text-gray-500 dark:text-white/70 hover:text-[#efc349]"
                        }`}
                      >
                        <item.icon size={20} />
                      </Link>
                    </div>
                  )}
                  {isLaunches && (open || isMobile) && <div className={`ml-7 overflow-hidden border-l border-border pl-3 transition-all duration-200 ${keepOpen ? "mt-1 max-h-32 opacity-100" : "max-h-0 opacity-0 group-hover/lancamentos:mt-1 group-hover/lancamentos:max-h-32 group-hover/lancamentos:opacity-100"}`}>{[["Lançamentos mensais","/admin/lancamentos"],["Balancete","/admin/lancamentos/balancete"],["Plano de contas","/admin/lancamentos/plano-contas"]].map(([label,to]) => <Link key={to} to={to} onClick={isMobile ? onClose : undefined} className={`block rounded-sm px-3 py-2 text-xs transition-colors ${currentPath === to ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>{label}</Link>)}</div>}
                </div>
              )})}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
