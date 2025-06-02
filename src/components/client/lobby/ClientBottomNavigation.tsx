
import { FileText, Calculator, Megaphone, Calendar, Building } from "lucide-react";
import { motion } from "framer-motion";

interface ClientBottomNavigationProps {
  activeSection: string;
  setActiveSection: (section: any) => void;
}

export const ClientBottomNavigation = ({ activeSection, setActiveSection }: ClientBottomNavigationProps) => {
  const navigationItems = [
    { id: 'documents', label: 'Documentos', icon: FileText },
    { id: 'simulations', label: 'Simulações', icon: Calculator },
    { id: 'announcements', label: 'Comunicados', icon: Megaphone },
    { id: 'calendar', label: 'Agenda', icon: Calendar },
    { id: 'company', label: 'Empresa', icon: Building },
  ];

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 bg-[#1a1f2e] border-t border-[#2a3441] z-50"
    >
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-[#F5C441] text-black'
                  : 'text-gray-400 hover:text-white hover:bg-[#F5C441]/10'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};
