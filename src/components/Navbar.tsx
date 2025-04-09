
import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import Logo from './navbar/Logo';
import DesktopNavbar from './navbar/DesktopNavbar';
import MobileNavbar from './navbar/MobileNavbar';
import { useNavigation } from './navbar/hooks/useNavigation';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const {
    handleLogout,
    navigateToDashboard
  } = useNavigation();
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return <header className="bg-orange-200 dark:bg-navy-dark text-navy dark:text-gold">
      <div className="container mx-auto flex items-center justify-between px-[28px] py-[19px]">
        <Logo />
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <DesktopNavbar handleLogout={handleLogout} navigateToDashboard={navigateToDashboard} />
          <button className="md:hidden text-gold hover:text-gold-light focus:outline-none transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}>
            <Menu size={24} />
          </button>
        </div>
      </div>

      <MobileNavbar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={handleLogout} navigateToDashboard={navigateToDashboard} />
    </header>;
};
export default Navbar;
