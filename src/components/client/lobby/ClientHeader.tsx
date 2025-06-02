
import { motion } from "framer-motion";
import { FileText, Calculator, Megaphone, Calendar, Building } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClientHeaderProps {
  activeSection: string;
  setActiveSection: (section: any) => void;
  isMobile: boolean;
}

export const ClientHeader = ({ activeSection, setActiveSection, isMobile }: ClientHeaderProps) => {
  const navigationItems = [
    { id: 'documents', label: 'Documentos', icon: FileText },
    { id: 'simulations', label: 'Simulações', icon: Calculator },
    { id: 'announcements', label: 'Comunicados', icon: Megaphone },
    { id: 'calendar', label: 'Agenda', icon: Calendar },
    { id: 'company', label: 'Empresa', icon: Building },
  ];

  return (
    <header className="bg-[#020817] border-b border-[#2a3441]">
      {/* Company Logo Banner */}
      <div className="bg-gradient-to-r from-[#1a1f2e] to-[#020817] py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center"
          >
            <img 
              src="/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png" 
              alt="WS Gestão Contábil" 
              className="h-16 w-auto"
            />
          </motion.div>
        </div>
      </div>

      {/* Navigation - Desktop only in header */}
      {!isMobile && (
        <div className="px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <nav className="flex gap-2">
              {navigationItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Button
                      variant={activeSection === item.id ? "default" : "ghost"}
                      className={`flex items-center gap-2 ${
                        activeSection === item.id
                          ? 'bg-[#F5C441] text-black hover:bg-[#F5C441]/90'
                          : 'text-white hover:text-[#F5C441] hover:bg-[#F5C441]/10'
                      }`}
                      onClick={() => setActiveSection(item.id)}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </motion.div>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};
