import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return <header className="bg-[#37353d]">
      <div className="container mx-auto flex items-center justify-between bg-[#37353d] px-[28px] py-[19px]">
        <div className="flex items-center">
          <a href="/" className="flex items-center space-x-2">
            <img alt="WS Gestão Contábil Logo" src="/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png" className="h-12  w-auto" />
          </a>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <a href="#servicos" className="nav-link text-sm font-prompt font-medium uppercase tracking-wider">
            Serviços
          </a>
          <a href="#sobre" className="nav-link text-sm font-prompt font-medium uppercase tracking-wider">
            Sobre
          </a>
          <a href="#contato" className="nav-link text-sm font-prompt font-medium uppercase tracking-wider">
            Contato
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
            <a href="#servicos" className="text-gold hover:text-gold-light text-xl font-prompt font-medium uppercase tracking-wider transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
              Serviços
            </a>
            <a href="#sobre" className="text-gold hover:text-gold-light text-xl font-prompt font-medium uppercase tracking-wider transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
              Sobre
            </a>
            <a href="#contato" className="text-gold hover:text-gold-light text-xl font-prompt font-medium uppercase tracking-wider transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
              Contato
            </a>
          </nav>
        </div>
      </div>
    </header>;
};
export default Navbar;