
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
        return (
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-white"
            >
              <h2 className="text-2xl font-bold mb-4">Bem-vindo à sua área</h2>
              <p className="text-gray-400">Selecione uma seção abaixo para começar</p>
            </motion.div>
          </div>
        );
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
