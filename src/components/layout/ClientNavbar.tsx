import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, User, Home, Calculator, ShieldCheck, Briefcase, FileText, Calendar, ClipboardList } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeSwitcher } from "@/components/client/ThemeSwitcher";
import { NotificationsDisplay } from "@/components/client/NotificationsDisplay";
import { NotificationPopupContainer } from "@/components/notifications/NotificationPopupContainer";

export const ClientNavbar = () => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: "/client", label: "Dashboard", icon: Home },
    { path: "/client/tax-simulation", label: "Simulação IRPF", icon: Calculator },
    { path: "/client/inss-simulation", label: "Simulação INSS", icon: ShieldCheck },
    { path: "/client/prolabore-simulation", label: "Pró-labore", icon: Briefcase },
    { path: "/client/documents", label: "Documentos", icon: FileText },
    { path: "/client/fiscal-calendar", label: "Agenda Fiscal", icon: Calendar },
    { path: "/client/polls", label: "Enquetes", icon: ClipboardList }
  ];

  return (
    <>
      <nav className="bg-white dark:bg-[#0b1320] border-b border-gray-200 dark:border-[#efc349]/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/client" className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-[#efc349] rounded-lg flex items-center justify-center">
                  <span className="text-[#020817] font-bold text-lg">W</span>
                </div>
                <span className="font-bold text-xl text-[#020817] dark:text-[#efc349]">
                  WS Gestão
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                      isActive(item.path)
                        ? "bg-[#efc349]/10 text-[#020817] dark:text-[#efc349]"
                        : "text-gray-600 dark:text-gray-300 hover:text-[#020817] dark:hover:text-[#efc349] hover:bg-gray-100 dark:hover:bg-[#efc349]/5"
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Right Side - Notifications, User, Theme Toggle, Logout */}
            <div className="flex items-center space-x-2">
              {/* Notifications */}
              <NotificationsDisplay />
              
              {/* User Info */}
              <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-md bg-gray-100 dark:bg-[#020817]/50">
                <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {user?.email?.split('@')[0] || 'Usuário'}
                </span>
              </div>

              {/* Theme Toggle */}
              <ThemeSwitcher />

              {/* Logout Button */}
              <Button
                onClick={signOut}
                variant="ghost"
                size="sm"
                className="text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:ml-2 sm:inline">Sair</span>
              </Button>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-200 dark:border-[#efc349]/20">
                {/* User Info Mobile */}
                <div className="flex items-center space-x-2 px-3 py-2 rounded-md bg-gray-100 dark:bg-[#020817]/50 mb-2">
                  <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {user?.email?.split('@')[0] || 'Usuário'}
                  </span>
                </div>

                {navItems.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                        isActive(item.path)
                          ? "bg-[#efc349]/10 text-[#020817] dark:text-[#efc349]"
                          : "text-gray-600 dark:text-gray-300 hover:text-[#020817] dark:hover:text-[#efc349] hover:bg-gray-100 dark:hover:bg-[#efc349]/5"
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <IconComponent className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </nav>
      
      {/* Container de Pop-ups de Notificações */}
      <NotificationPopupContainer />
    </>
  );
};
