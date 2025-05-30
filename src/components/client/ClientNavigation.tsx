
import { useState } from 'react';
import { FileText, Calculator, Megaphone, Calendar, Building } from 'lucide-react';
import { DocumentTabs } from './DocumentTabs';
import { SimulationsSection } from './sections/SimulationsSection';
import { AnnouncementsSection } from './sections/AnnouncementsSection';
import { FiscalCalendarSection } from './sections/FiscalCalendarSection';
import { CompanyDataSection } from './sections/CompanyDataSection';
import { useIsMobile } from '@/hooks/use-mobile';

interface ClientNavigationProps {
  documents: any[];
  allDocuments: any[];
  documentsByCategory: Record<string, any[]>;
  categories: any[];
  setSelectedCategory: (category: string | null) => void;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
  activeCategory: string;
}

export const ClientNavigation = ({
  documents,
  allDocuments,
  documentsByCategory,
  categories,
  setSelectedCategory,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments,
  activeCategory
}: ClientNavigationProps) => {
  const [activeTab, setActiveTab] = useState('documents');
  const isMobile = useIsMobile();

  const tabs = [
    { id: 'documents', label: 'Documentos', icon: FileText },
    { id: 'simulations', label: 'Simulações', icon: Calculator },
    { id: 'announcements', label: 'Comunicados', icon: Megaphone },
    { id: 'calendar', label: 'Agenda', icon: Calendar },
    { id: 'company', label: 'Empresa', icon: Building }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'documents':
        return (
          <DocumentTabs
            documents={documents}
            allDocuments={allDocuments}
            documentsByCategory={documentsByCategory}
            categories={categories}
            setSelectedCategory={setSelectedCategory}
            formatDate={formatDate}
            isDocumentExpired={isDocumentExpired}
            daysUntilExpiration={daysUntilExpiration}
            refreshDocuments={refreshDocuments}
            activeCategory={activeCategory}
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
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Content Area */}
      <div className="min-h-[60vh]">
        {renderContent()}
      </div>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#0b1320]/95 backdrop-blur-md border-t border-[#efc349]/20 z-50">
        <div className="grid grid-cols-5 h-20">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
                  isActive
                    ? 'text-[#efc349] bg-[#efc349]/10'
                    : 'text-gray-500 dark:text-gray-400 hover:text-[#efc349] hover:bg-[#efc349]/5'
                }`}
              >
                <Icon 
                  size={20} 
                  className={`transition-transform duration-300 ${
                    isActive ? 'scale-110' : 'scale-100'
                  }`}
                />
                <span className={`text-xs font-medium transition-all duration-300 ${
                  isActive ? 'font-semibold' : 'font-normal'
                }`}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-[#efc349] rounded-b-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
