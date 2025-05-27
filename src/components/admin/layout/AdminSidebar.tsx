
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { 
  Users, 
  FileText, 
  PieChart, 
  Settings, 
  LayoutDashboard, 
  HardDrive,
  Calculator,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const AdminSidebar = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/admin/users", icon: Users, label: "Usuários" },
    { path: "/admin/storage", icon: HardDrive, label: "Armazenamento" },
    { path: "/admin/polls", icon: PieChart, label: "Enquetes" },
    { path: "/admin/simulations", icon: Calculator, label: "Simulações" },
    { path: "/admin/tools", icon: FileText, label: "Ferramentas" },
    { path: "/admin/settings", icon: Settings, label: "Configurações" },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50 bg-white dark:bg-[#020817] shadow-lg"
        onClick={toggleMobileMenu}
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6 text-[#020817] dark:text-[#efc349]" />
        ) : (
          <Menu className="h-6 w-6 text-[#020817] dark:text-[#efc349]" />
        )}
      </Button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full w-64 bg-white dark:bg-[#020817] border-r border-gray-200 dark:border-[#efc349]/30 z-40 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:z-auto
      `}>
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="p-6 border-b border-gray-200 dark:border-[#efc349]/30">
            <h2 className="text-xl text-[#020817] dark:text-[#efc349] font-extralight">
              WS Gestão
            </h2>
            <p className="text-sm text-gray-500 dark:text-white/70 font-extralight">
              Painel Administrativo
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 font-extralight ${
                    isActive
                      ? "bg-[#efc349]/10 text-[#efc349] border-l-4 border-[#efc349]"
                      : "text-gray-600 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-[#efc349]/5 hover:text-[#020817] dark:hover:text-[#efc349]"
                  }`
                }
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-[#efc349]/30">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-extralight"
            >
              Sair
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminSidebar;
