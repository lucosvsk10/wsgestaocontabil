
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { X, Instagram, UserCircle, LogOut, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface MobileNavbarProps {
  isOpen: boolean;
  onClose: () => void;
  handleLogout: () => Promise<void>;
  navigateToDashboard: () => void;
}

const MobileNavbar = ({ isOpen, onClose, handleLogout, navigateToDashboard }: MobileNavbarProps) => {
  const location = useLocation();
  const { user } = useAuth();
  
  const shouldHideNavLinks = ['/login', '/admin', '/client'].includes(location.pathname);
  const isOnDashboardPage = ['/admin', '/client'].includes(location.pathname);
  const shouldHideAccountButton = ['/client', '/admin'].includes(location.pathname);

  return (
    <div className={`md:hidden fixed inset-0 z-40 bg-navy-dark/95 backdrop-blur-md transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="container mx-auto px-6 py-8 flex flex-col h-full">
        <div className="flex justify-end mb-8">
          <button className="text-gold hover:text-gold-light focus:outline-none transition-colors" onClick={onClose} aria-label="Close menu">
            <X size={24} />
          </button>
        </div>
        <nav className="flex flex-col space-y-8 items-center text-center mt-12">
          {!shouldHideNavLinks && <>
              <a href="#servicos" className="text-gold hover:text-gold-light text-xl font-prompt font-medium uppercase tracking-wider transition-colors" onClick={onClose}>
                Serviços
              </a>
              <a href="#sobre" className="text-gold hover:text-gold-light text-xl font-prompt font-medium uppercase tracking-wider transition-colors" onClick={onClose}>
                Sobre
              </a>
              <a href="#contabil" className="text-gold hover:text-gold-light text-xl font-prompt font-medium uppercase tracking-wider transition-colors" onClick={onClose}>
                Contábil
              </a>
              <a href="#contato" className="text-gold hover:text-gold-light text-xl font-prompt font-medium uppercase tracking-wider transition-colors" onClick={onClose}>
                Contato
              </a>
            </>}
          
          {user ? (
            <>
              {!shouldHideAccountButton && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex items-center text-[#e8cc81] hover:text-[#e8cc81]/80 text-xl">
                    <UserCircle size={24} className="mr-2" />
                    <span className="font-prompt font-medium uppercase tracking-wider">CONTA</span>
                  </div>
                  
                  <button 
                    onClick={() => {
                      navigateToDashboard();
                      onClose();
                    }} 
                    className="flex items-center text-gold hover:text-gold-light text-lg transition-colors"
                  >
                    <FileText size={20} className="mr-2" />
                    <span className="font-prompt font-medium uppercase tracking-wider">MEUS DOCS</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      handleLogout();
                      onClose();
                    }} 
                    className="flex items-center text-gold hover:text-gold-light text-lg transition-colors"
                  >
                    <LogOut size={20} className="mr-2" />
                    <span className="font-prompt font-medium uppercase tracking-wider">SAIR</span>
                  </button>
                </div>
              )}
              
              {isOnDashboardPage && (
                <button 
                  onClick={() => {
                    handleLogout();
                    onClose();
                  }} 
                  className="flex items-center text-gold hover:text-gold-light text-xl transition-colors"
                >
                  <LogOut size={24} className="mr-2" />
                  <span className="font-prompt font-medium uppercase tracking-wider">Sair</span>
                </button>
              )}
            </>
          ) : (
            <Link 
              to="/login" 
              className="flex items-center text-gold hover:text-gold-light text-xl transition-colors" 
              onClick={onClose}
            >
              <UserCircle size={24} className="mr-2" />
              <span className="font-prompt font-medium uppercase tracking-wider">Login</span>
            </Link>
          )}
          
          <a 
            href="https://www.instagram.com/ws_gestao_contabil?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-gold hover:text-gold-light text-xl transition-colors" 
            aria-label="Instagram" 
            onClick={onClose}
          >
            <Instagram size={24} />
          </a>
        </nav>
      </div>
    </div>
  );
};

export default MobileNavbar;
