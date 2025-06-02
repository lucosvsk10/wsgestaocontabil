
import { useState } from "react";
import { motion } from "framer-motion";
import { Document } from "@/types/admin";
import { DocumentCategory } from "@/types/common";
import { ClientHeader } from "./ClientHeader";
import { ClientBottomNavigation } from "./ClientBottomNavigation";
import { DocumentsSection } from "./sections/DocumentsSection";
import { SimulationsSection } from "../sections/SimulationsSection";
import { AnnouncementsSection } from "../sections/AnnouncementsSection";
import { FiscalCalendarSection } from "../sections/FiscalCalendarSection";
import { CompanyDataSection } from "../sections/CompanyDataSection";
import { FileText, Calculator, Megaphone, Calendar } from "lucide-react";

interface ClientLobbyViewProps {
  isLoadingDocuments: boolean;
  isLoadingCategories: boolean;
  documents: Document[];
  documentsByCategory: Record<string, Document[]>;
  commonCategories: DocumentCategory[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  fetchUserDocuments: (userId: string) => void;
  userId: string;
  isMobile: boolean;
}

type ActiveSection = 'lobby' | 'documents' | 'simulations' | 'announcements' | 'calendar' | 'company';

export const ClientLobbyView = ({
  isLoadingDocuments,
  isLoadingCategories,
  documents,
  documentsByCategory,
  commonCategories,
  selectedCategory,
  setSelectedCategory,
  fetchUserDocuments,
  userId,
  isMobile
}: ClientLobbyViewProps) => {
  const [activeSection, setActiveSection] = useState<ActiveSection>('lobby');

  const navigationOptions = [
    { id: 'documents', label: 'Documentos', icon: FileText, description: 'Visualize seus documentos' },
    { id: 'calendar', label: 'Agenda', icon: Calendar, description: 'Consulte eventos fiscais' },
    { id: 'simulations', label: 'Simulações', icon: Calculator, description: 'Histórico de cálculos' },
    { id: 'announcements', label: 'Comunicados', icon: Megaphone, description: 'Mensagens importantes' },
  ];

  const renderLobbyScreen = () => (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      {/* Company Logo Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 text-center"
      >
        <div className="bg-[#1a1f2e] rounded-2xl p-8 border border-[#2a3441] mb-6">
          <img 
            src="/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png" 
            alt="WS Gestão Contábil" 
            className="h-20 w-auto mx-auto" 
          />
        </div>
        <p className="text-gray-400 text-sm">
          Área do cliente - WS Gestão Contábil
        </p>
      </motion.div>

      {/* Navigation Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl w-full">
        {navigationOptions.map((option, index) => {
          const Icon = option.icon;
          return (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setActiveSection(option.id as ActiveSection)}
              className="bg-[#1a1f2e] border border-[#2a3441] rounded-xl p-6 hover:border-[#F5C441] hover:shadow-lg hover:shadow-[#F5C441]/10 transition-all duration-300 group"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#F5C441]/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#F5C441]/20 transition-colors">
                  <Icon className="w-8 h-8 text-[#F5C441]" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{option.label}</h3>
                <p className="text-gray-400 text-sm">{option.description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'documents':
        return (
          <DocumentsSection
            isLoadingDocuments={isLoadingDocuments}
            isLoadingCategories={isLoadingCategories}
            documents={documents}
            documentsByCategory={documentsByCategory}
            commonCategories={commonCategories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            fetchUserDocuments={fetchUserDocuments}
            userId={userId}
          />
        );
      case 'simulations':
        return <SimulationsSection />;
      case 'announcements':
        return <AnnouncementsSection />;
      case 'calendar':
        return <FiscalCalendarSection />;
      case 'company':
        return <CompanyDataSection />;
      default:
        return renderLobbyScreen();
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] flex flex-col">
      <ClientHeader 
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isMobile={isMobile}
      />
      
      <main className="flex-1 overflow-y-auto pb-20">
        {renderActiveSection()}
      </main>

      <ClientBottomNavigation
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />
    </div>
  );
};
