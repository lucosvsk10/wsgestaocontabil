import { useAuth } from '@/contexts/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';
import { ChevronLeft, ChevronRight, Menu, UserCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useNavigation } from '@/components/navbar/hooks/useNavigation';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

interface AdminHeaderProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const AdminHeader = ({ sidebarOpen, toggleSidebar }: AdminHeaderProps) => {
  const { user } = useAuth();
  const { handleLogout } = useNavigation();
  const location = useLocation();

  const routeInfo = (() => {
    const path = location.pathname;
    if (path.startsWith('/admin/lancamentos'))
      return { eyebrow: 'Operação contábil', title: 'Lançamentos' };
    if (path.startsWith('/admin/users')) return { eyebrow: 'Administração', title: 'Usuários' };
    if (path.startsWith('/admin/storage')) return { eyebrow: 'Documentos', title: 'Armazenamento' };
    if (path.startsWith('/admin/agenda')) return { eyebrow: 'Organização', title: 'Agenda fiscal' };
    if (path.startsWith('/admin/polls')) return { eyebrow: 'Relacionamento', title: 'Enquetes' };
    if (path.startsWith('/admin/settings')) return { eyebrow: 'Sistema', title: 'Configurações' };
    return { eyebrow: 'Visão geral', title: 'Painel administrativo' };
  })();

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#08111f]/90 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          aria-label={sidebarOpen ? 'Recolher menu lateral' : 'Expandir menu lateral'}
        >
          <span className="md:hidden">
            <Menu className="h-5 w-5" />
          </span>
          <span className="hidden md:block">
            {sidebarOpen ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </span>
        </Button>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b18416] dark:text-[#efc349]">
            {routeInfo.eyebrow}
          </p>
          <h1 className="truncate text-base font-semibold text-slate-900 dark:text-white sm:text-lg">
            {routeInfo.title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-[#efc349] dark:hover:bg-white/10"
            >
              <UserCircle className="h-6 w-6 text-gray-600 dark:text-[#efc349]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 bg-white dark:bg-[#020817] border border-gray-200 dark:border-[#efc349]/30 shadow-xl dark:shadow-none rounded-xl backdrop-blur-sm"
          >
            <div className="px-4 py-3 text-sm font-medium text-[#020817] dark:text-white border-b border-gray-100 dark:border-[#efc349]/20">
              {user?.email || 'Usuário'}
            </div>
            <DropdownMenuSeparator className="bg-gray-100 dark:bg-[#efc349]/20" />
            <DropdownMenuItem
              asChild
              className="text-[#020817] hover:bg-gray-50 focus:bg-gray-50 dark:text-white dark:hover:bg-[#efc349]/10 dark:focus:bg-[#efc349]/10 transition-all duration-300"
            >
              <Link to="/" className="flex items-center px-4 py-2">
                Voltar ao site
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-[#020817] hover:bg-gray-50 focus:bg-gray-50 dark:text-white dark:hover:bg-[#efc349]/10 dark:focus:bg-[#efc349]/10 transition-all duration-300"
            >
              <span className="flex items-center px-4 py-2">Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AdminHeader;
