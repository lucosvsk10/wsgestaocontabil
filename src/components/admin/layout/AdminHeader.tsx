import { useAuth } from '@/contexts/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigation } from '@/components/navbar/hooks/useNavigation';
import { Link, useLocation } from 'react-router-dom';

interface AdminHeaderProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const routeTitles: Array<[string, string]> = [
  ['/admin/lancamentos', 'Lançamentos contábeis'],
  ['/admin/users', 'Usuários'],
  ['/admin/storage', 'Armazenamento'],
  ['/admin/agenda', 'Agenda fiscal'],
  ['/admin/carousel', 'Carrossel'],
  ['/admin/polls', 'Enquetes'],
  ['/admin/tools', 'Ferramentas'],
  ['/admin/simulations', 'Simulações'],
  ['/admin/announcements', 'Anúncios'],
  ['/admin/settings', 'Configurações'],
];

const AdminHeader = ({ sidebarOpen, toggleSidebar }: AdminHeaderProps) => {
  const { user } = useAuth();
  const { handleLogout } = useNavigation();
  const location = useLocation();
  const title = routeTitles.find(([path]) => location.pathname.startsWith(path))?.[1] || 'Visão geral';
  const initials = (user?.email || 'WS').slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-black/10 bg-white px-4 dark:border-white/10 dark:bg-[#111214] sm:px-6 lg:px-10">
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex h-9 w-9 shrink-0 flex-col items-center justify-center gap-1 border border-black/15 bg-transparent hover:bg-black/[0.03] dark:border-white/15 dark:hover:bg-white/[0.04]"
          aria-label={sidebarOpen ? 'Recolher menu lateral' : 'Expandir menu lateral'}
        >
          <span className="h-px w-4 bg-current" />
          <span className="h-px w-4 bg-current" />
          <span className="h-px w-4 bg-current" />
        </button>
        <div className="min-w-0">
          <p className="text-[11px] text-black/45 dark:text-white/45">Administração</p>
          <h1 className="truncate text-sm font-semibold tracking-[-0.01em]">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-9 min-w-9 items-center justify-center border border-black/15 px-2 text-[11px] font-semibold dark:border-white/15"
            >
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-none">
            <div className="px-3 py-2 text-xs text-muted-foreground">{user?.email || 'Usuário'}</div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/">Voltar ao site</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AdminHeader;
