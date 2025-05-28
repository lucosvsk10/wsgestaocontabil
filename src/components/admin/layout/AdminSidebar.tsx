
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  FileText, 
  BarChart3, 
  FolderOpen, 
  Calculator,
  Megaphone,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ open, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const isMobile = useIsMobile();

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: Users, label: "Usuários", path: "/admin/users" },
    { icon: FileText, label: "Documentos", path: "/admin/user-documents" },
    { icon: FolderOpen, label: "Armazenamento", path: "/admin/storage" },
    { icon: BarChart3, label: "Enquetes", path: "/admin/polls" },
    { icon: Calculator, label: "Ferramentas", path: "/admin/tools" },
    { icon: BarChart3, label: "Simulações", path: "/admin/simulations" },
    { icon: Megaphone, label: "Anúncios", path: "/admin/announcements" },
    { icon: Settings, label: "Configurações", path: "/admin/settings" },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && open && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "bg-[#020817] border-r border-[#efc349]/20 flex flex-col transition-all duration-300 ease-in-out",
        isMobile ? (
          open ? "fixed left-0 top-0 h-full w-72 z-50" : "fixed left-0 top-0 h-full w-0 overflow-hidden z-50"
        ) : (
          open ? "w-72" : "w-16"
        )
      )}>
        {/* Header */}
        <div className="p-6 border-b border-[#efc349]/20 relative">
          {isMobile && open && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-4 right-4 text-[#efc349] hover:bg-[#efc349]/10"
            >
              <X size={20} />
            </Button>
          )}
          
          <div className={cn("flex items-center", open ? "justify-start" : "justify-center")}>
            <div className="w-8 h-8 bg-[#efc349] rounded-lg flex items-center justify-center text-[#020817] font-bold">
              WS
            </div>
            {open && (
              <div className="ml-3">
                <h1 className="text-[#efc349] text-lg font-extralight">
                  WS Gestão
                </h1>
                <p className="text-white/70 text-xs font-extralight">
                  Painel Administrativo
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path === "/admin" && location.pathname === "/admin");
            
            return (
              <Button
                key={item.path}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-white/80 hover:text-[#efc349] hover:bg-[#efc349]/10 font-extralight",
                  isActive && "bg-[#efc349]/20 text-[#efc349] border border-[#efc349]/30",
                  !open && "px-2"
                )}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) onClose();
                }}
              >
                <Icon size={20} className="flex-shrink-0" />
                {open && <span className="ml-3">{item.label}</span>}
              </Button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#efc349]/20">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-white/80 hover:text-red-400 hover:bg-red-400/10 font-extralight",
              !open && "px-2"
            )}
            onClick={handleSignOut}
          >
            <LogOut size={20} className="flex-shrink-0" />
            {open && <span className="ml-3">Sair</span>}
          </Button>
        </div>
      </div>
    </>
  );
};

export default AdminSidebar;
