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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#dbe3ee] bg-white/95 px-4 backdrop-blur dark:border-[#20324a] dark:bg-[#0b1728]/95 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex h-9 w-9 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-[#dbe3ee] bg-white text-[#475569] transition-colors hover:border-blue-300 hover:text-blue-600 dark:border-[#20324a] dark:bg-[#0f1d30] dark:text-[#9fb0c6] dark:hover:border-blue-500/60 dark:hover:text-blue-300"
          aria-label={sidebarOpen ? 'Recolher menu lateral' : 'Expandir menu lateral'}
        >
          <span className="h-px w-4 bg-current" />
          <span className="h-px w-4 bg-current" />
          <span className="h-px w-4 bg-current" />
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-blue-600 dark:text-blue-400">Administração</p>
          <h1 className="truncate text-sm font-semibold tracking-[-0.015em] text-[#122033] dark:text-[#e6edf7]">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-9 min-w-9 items-center justify-center rounded-md border border-[#dbe3ee] bg-[#f8fafc] px-2 text-[11px] font-bold text-[#334155] dark:border-[#20324a] dark:bg-[#0f1d30] dark:text-[#d7e2ef]"
            >
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-lg border-[#dbe3ee] dark:border-[#20324a]">
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
