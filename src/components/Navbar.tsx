import { useState, useEffect } from 'react';
import { Menu, X, Instagram, UserCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Check if we're on a route that should hide navigation items
  const shouldHideNavLinks = ['/login', '/admin', '/client'].includes(location.pathname);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return <header className="bg-[#37353d]">
      <div className="container mx-auto flex items-center justify-between px-[28px] py-[19px] bg-[#46413d]">
        <div className="flex items-center">
          <a href="/" className="flex items-center space-x-2">
            <img alt="WS Gestão Contábil Logo" src="/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png" className="h-8  w-auto" />
          </a>
        </div>

        {/* Desktop Navigation */}
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
          
          <Link to="/login" className="flex items-center text-gold hover:text-gold-light transition-colors duration-300">
            <UserCircle size={20} className="mr-1" />
            <span className="text-sm font-prompt font-medium uppercase tracking-wider">Login</span>
          </Link>
          <a href="https://www.instagram.com/ws_gestao_contabil?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light transition-colors duration-300" aria-label="Instagram">
            <Instagram size={20} />
          </a>
        </nav>

        {/* Mobile Menu Button */}
        <button className="md:hidden text-gold hover:text-gold-light focus:outline-none transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      <div className={`md:hidden fixed inset-0 z-40 bg-navy-dark/95 backdrop-blur-md transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="container mx-auto px-6 py-8 flex flex-col h-full">
          <div className="flex justify-end mb-8">
            <button className="text-gold hover:text-gold-light focus:outline-none transition-colors" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">
              <X size={24} />
            </button>
          </div>
          <nav className="flex flex-col space-y-8 items-center text-center mt-12">
            {!shouldHideNavLinks && <>
                <a href="#servicos" className="text-gold hover:text-gold-light text-xl font-prompt font-medium uppercase tracking-wider transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                  Serviços
                </a>
                <a href="#sobre" className="text-gold hover:text-gold-light text-xl font-prompt font-medium uppercase tracking-wider transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                  Sobre
                </a>
                <a href="#contabil" className="text-gold hover:text-gold-light text-xl font-prompt font-medium uppercase tracking-wider transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                  Contábil
                </a>
                <a href="#contato" className="text-gold hover:text-gold-light text-xl font-prompt font-medium uppercase tracking-wider transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                  Contato
                </a>
              </>}
            <Link to="/login" className="flex items-center text-gold hover:text-gold-light text-xl transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
              <UserCircle size={24} className="mr-2" />
              <span className="font-prompt font-medium uppercase tracking-wider">Login</span>
            </Link>
            <a href="https://www.instagram.com/ws_gestao_contabil?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light text-xl transition-colors" aria-label="Instagram" onClick={() => setIsMobileMenuOpen(false)}>
              <Instagram size={24} />
            </a>
          </nav>
        </div>
      </div>
    </header>;
};
export default Navbar;