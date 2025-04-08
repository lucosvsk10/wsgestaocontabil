
import { Link, useLocation } from 'react-router-dom';
import { Instagram, UserCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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
      {!shouldHideNavLinks && <>
          <a href="#servicos" className="nav-link text-sm font-prompt font-medium uppercase tracking-wider">
            Serviços
          </a>
          <a href="#sobre" className="nav-link text-sm font-prompt font-medium uppercase tracking-wider">
            Sobre
          </a>
          <a href="#contabil" className="nav-link text-sm font-prompt font-medium uppercase tracking-wider">
            Contábil
          </a>
        </>}
      
      {user ? (
        <>
          {!shouldHideAccountButton && (
            <button 
              onClick={navigateToDashboard} 
              className="flex items-center text-[#e8cc81] hover:text-[#e8cc81]/80 transition-colors duration-300"
            >
              <UserCircle size={20} className="mr-1" />
              <span className="text-sm font-medium uppercase tracking-wider">CONTA</span>
            </button>
          )}
          
          {isOnDashboardPage && (
            <button 
              onClick={handleLogout} 
              className="flex items-center text-gold hover:text-gold-light transition-colors duration-300"
            >
              <LogOut size={20} className="mr-1" />
              <span className="text-sm font-medium uppercase tracking-wider">Sair</span>
            </button>
          )}
        </>
      ) : (
        <Link to="/login" className="flex items-center text-gold hover:text-gold-light transition-colors duration-300">
          <UserCircle size={20} className="mr-1" />
          <span className="text-sm font-medium uppercase tracking-wider">Login</span>
        </Link>
      )}
      
      <a href="https://www.instagram.com/ws_gestao_contabil?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light transition-colors duration-300" aria-label="Instagram">
        <Instagram size={20} />
      </a>
    </nav>
  );
};

export default DesktopNavbar;
