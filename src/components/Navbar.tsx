
import { useState, useEffect } from 'react';
import { Menu, UserCircle } from 'lucide-react';
import Logo from './navbar/Logo';
import DesktopNavbar from './navbar/DesktopNavbar';
import MobileNavbar from './navbar/MobileNavbar';
import { useNavigation } from './navbar/hooks/useNavigation';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import NotificationBell from './notifications/NotificationBell';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const {
    handleLogout,
    navigateToDashboard
  } = useNavigation();
  const {
    user,
    isAdmin
  } = useAuth();
  const isMobile = useIsMobile();
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <header className={`bg-[#FFF1DE] text-[#020817] dark:text-gold dark:bg-deepNavy-80 transition-all duration-300 ${isScrolled ? 'shadow-sm' : ''}`}>
      <div className={`container mx-auto flex items-center justify-between ${isMobile ? 'px-4 py-3' : 'px-[28px] py-[19px]'}`}>
        <Logo />
        <div className="flex items-center gap-4">
          <ThemeToggle />
          
          {/* Notifications - show ONLY for logged-in non-admin users */}
          {user && !isAdmin && <NotificationBell />}
          
          {/* Account Button for Mobile */}
          {isMobile && user && <button onClick={navigateToDashboard} className="text-[#efc349] hover:text-[#d6a932] dark:text-gold dark:hover:text-gold-light focus:outline-none transition-colors" aria-label="Conta">
              <UserCircle size={24} />
            </button>}
          
          {/* Login Button for Mobile */}
          {isMobile && !user && <Link to="/login" className="text-[#efc349] hover:text-[#d6a932] dark:text-gold dark:hover:text-gold-light focus:outline-none transition-colors" aria-label="Login">
              <UserCircle size={24} />
            </Link>}
          
          <DesktopNavbar handleLogout={handleLogout} navigateToDashboard={navigateToDashboard} />
          <button className="md:hidden text-[#efc349] hover:text-[#d6a932] dark:text-gold dark:hover:text-gold-light focus:outline-none transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}>
            <Menu size={24} />
          </button>
        </div>
      </div>

      <MobileNavbar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={handleLogout} navigateToDashboard={navigateToDashboard} />
    </header>
  );
};

export default Navbar;
