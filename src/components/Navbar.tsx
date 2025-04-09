
import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import Logo from './navbar/Logo';
import DesktopNavbar from './navbar/DesktopNavbar';
import MobileNavbar from './navbar/MobileNavbar';
import { useNavigation } from './navbar/hooks/useNavigation';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { handleLogout, navigateToDashboard } = useNavigation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="bg-white dark:bg-[#46413d] text-navy dark:text-white">
      <div className="container mx-auto flex items-center justify-between px-[28px] py-[19px] bg-white dark:bg-[#46413d]">
        <Logo />
        <div className="flex items-center">
          <DesktopNavbar 
            handleLogout={handleLogout} 
            navigateToDashboard={navigateToDashboard} 
          />
          <button 
            className="md:hidden text-gold hover:text-gold-light focus:outline-none transition-colors" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      <MobileNavbar 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        handleLogout={handleLogout}
        navigateToDashboard={navigateToDashboard}
      />
    </header>
  );
};

export default Navbar;
