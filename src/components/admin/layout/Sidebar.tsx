import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, X, HelpCircle, MessageSquare } from 'lucide-react';

const Sidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return (
    <aside className={`fixed top-0 left-0 z-30 h-screen w-64 bg-navy dark:bg-navy-dark text-white transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="p-5 border-b border-navy-light dark:border-navy-lighter">
        <div className="flex items-center justify-between">
          <Link to="/admin" className="flex items-center">
            <span className="text-xl font-semibold text-gold">WS</span>
            <span className="ml-2 text-lg font-medium tracking-wider">GESTÃO</span>
          </Link>
          <button className="md:hidden" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
      </div>

      <nav className="p-4 space-y-6">
        <div className="space-y-2">
          <h2 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Administração</h2>
          
          <div className="space-y-1">
            <NavLink 
              to="/admin" 
              className={({ isActive }) => `flex items-center px-4 py-3 text-sm rounded-md transition-colors ${isActive ? 'bg-navy-light dark:bg-navy-lighter text-gold' : 'hover:bg-navy-light dark:hover:bg-navy-lighter hover:text-gold'}`}
              end
            >
              <LayoutDashboard size={18} className="mr-3" />
              <span>Dashboard</span>
            </NavLink>
            
            <NavLink 
              to="/admin/users" 
              className={({ isActive }) => `flex items-center px-4 py-3 text-sm rounded-md transition-colors ${isActive ? 'bg-navy-light dark:bg-navy-lighter text-gold' : 'hover:bg-navy-light dark:hover:bg-navy-lighter hover:text-gold'}`}
            >
              <Users size={18} className="mr-3" />
              <span>Usuários</span>
            </NavLink>
            
            <NavLink 
              to="/admin/documents" 
              className={({ isActive }) => `flex items-center px-4 py-3 text-sm rounded-md transition-colors ${isActive ? 'bg-navy-light dark:bg-navy-lighter text-gold' : 'hover:bg-navy-light dark:hover:bg-navy-lighter hover:text-gold'}`}
            >
              <FileText size={18} className="mr-3" />
              <span>Documentos</span>
            </NavLink>
            
            <NavLink 
              to="/admin/polls" 
              className={({ isActive }) => `flex items-center px-4 py-3 text-sm rounded-md transition-colors ${isActive ? 'bg-navy-light dark:bg-navy-lighter text-gold' : 'hover:bg-navy-light dark:hover:bg-navy-lighter hover:text-gold'}`}
            >
              {/* Ícone para Enquetes */}
              <span>Enquetes</span>
            </NavLink>
            
            <NavLink 
              to="/admin/simulator" 
              className={({ isActive }) => `flex items-center px-4 py-3 text-sm rounded-md transition-colors ${isActive ? 'bg-navy-light dark:bg-navy-lighter text-gold' : 'hover:bg-navy-light dark:hover:bg-navy-lighter hover:text-gold'}`}
            >
              {/* Ícone para Simulador */}
              <span>Simulador</span>
            </NavLink>
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Suporte</h2>
          <div className="space-y-1">
            <a href="#" className="flex items-center px-4 py-3 text-sm rounded-md hover:bg-navy-light dark:hover:bg-navy-lighter hover:text-gold">
              <HelpCircle size={18} className="mr-3" />
              <span>Ajuda</span>
            </a>
            <a href="#" className="flex items-center px-4 py-3 text-sm rounded-md hover:bg-navy-light dark:hover:bg-navy-lighter hover:text-gold">
              <MessageSquare size={18} className="mr-3" />
              <span>Feedback</span>
            </a>
          </div>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
