
import { Link, useLocation } from 'react-router-dom';
import { Instagram, UserCircle, LogOut, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DesktopNavbarProps {
  handleLogout: () => Promise<void>;
  navigateToDashboard: () => void;
}

const DesktopNavbar = ({ handleLogout, navigateToDashboard }: DesktopNavbarProps) => {
  const location = useLocation();
  const { user } = useAuth();
  
  const shouldHideNavLinks = ['/login', '/admin', '/client'].includes(location.pathname);
  const isOnDashboardPage = ['/admin', '/client'].includes(location.pathname);
  const shouldHideAccountButton = ['/client', '/admin'].includes(location.pathname);

  return (
    <nav className="hidden md:flex items-center space-x-8">
      {/* Account or Login button first */}
      {user ? (
        <>
          {!shouldHideAccountButton && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center text-gold-dark hover:text-gold-dark/80 dark:text-gold dark:hover:text-gold/80 transition-colors duration-300">
                <UserCircle size={20} className="mr-1" />
                <span className="text-sm font-medium uppercase tracking-wider">CONTA</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-orange-200 dark:bg-navy-dark border-gold/20">
                <DropdownMenuItem 
                  className="text-gold-dark hover:text-gold dark:text-gold dark:hover:text-gold-light cursor-pointer"
                  onClick={navigateToDashboard}
                >
                  <FileText size={16} className="mr-2" />
                  <span className="text-sm font-medium uppercase tracking-wider">MEUS DOCS</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-gold-dark hover:text-gold dark:text-gold dark:hover:text-gold-light cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut size={16} className="mr-2" />
                  <span className="text-sm font-medium uppercase tracking-wider">SAIR</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {isOnDashboardPage && (
            <button 
              onClick={handleLogout} 
              className="flex items-center text-gold-dark hover:text-gold dark:text-gold dark:hover:text-gold-light transition-colors duration-300"
            >
              <LogOut size={20} className="mr-1" />
              <span className="text-sm font-medium uppercase tracking-wider">Sair</span>
            </button>
          )}
        </>
      ) : (
        <Link to="/login" className="flex items-center text-gold-dark hover:text-gold dark:text-gold dark:hover:text-gold-light transition-colors duration-300">
          <UserCircle size={20} className="mr-1" />
          <span className="text-sm font-medium uppercase tracking-wider">Login</span>
        </Link>
      )}
      
      {/* Service links in the requested order */}
      {!shouldHideNavLinks && (
        <>
          <a href="#servicos" className="nav-link text-sm font-prompt font-medium uppercase tracking-wider text-gold-dark dark:text-gold">
            Serviços
          </a>
          <a href="#sobre" className="nav-link text-sm font-prompt font-medium uppercase tracking-wider text-gold-dark dark:text-gold">
            Sobre
          </a>
          <a href="#contabil" className="nav-link text-sm font-prompt font-medium uppercase tracking-wider text-gold-dark dark:text-gold">
            Contábil
          </a>
        </>
      )}
      
      {/* Instagram link always at the end */}
      <a href="https://www.instagram.com/ws_gestao_contabil?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer" className="text-gold-dark hover:text-gold dark:text-gold dark:hover:text-gold-light transition-colors duration-300" aria-label="Instagram">
        <Instagram size={20} />
      </a>
    </nav>
  );
};

export default DesktopNavbar;
