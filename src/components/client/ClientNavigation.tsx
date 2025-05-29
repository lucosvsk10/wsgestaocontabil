
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className={`grid w-full ${isMobile ? 'grid-cols-3' : 'grid-cols-5'} bg-white dark:bg-[#0b1320] border border-gray-200 dark:border-[#efc349]/30`}>
        <TabsTrigger value="documents" className="font-extralight text-[#020817] dark:text-[#efc349] data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817]">
          <FileText className="w-4 h-4 mr-1" />
          {isMobile ? 'Docs' : 'Documentos'}
        </TabsTrigger>
        <TabsTrigger value="simulations" className="font-extralight text-[#020817] dark:text-[#efc349] data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817]">
          <Calculator className="w-4 h-4 mr-1" />
          {isMobile ? 'Sim' : 'Simulações'}
        </TabsTrigger>
        <TabsTrigger value="announcements" className="font-extralight text-[#020817] dark:text-[#efc349] data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817]">
          <Megaphone className="w-4 h-4 mr-1" />
          {isMobile ? 'Com' : 'Comunicados'}
        </TabsTrigger>
        {!isMobile && (
          <>
            <TabsTrigger value="calendar" className="font-extralight text-[#020817] dark:text-[#efc349] data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817]">
              <Calendar className="w-4 h-4 mr-1" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="company" className="font-extralight text-[#020817] dark:text-[#efc349] data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817]">
              <Building className="w-4 h-4 mr-1" />
              Empresa
            </TabsTrigger>
          </>
        )}
      </TabsList>

      <div className="mt-6">
        <TabsContent value="documents" className="space-y-4">
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
        </TabsContent>

        <TabsContent value="simulations" className="space-y-4">
          <SimulationsSection />
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">
          <AnnouncementsSection />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <FiscalCalendarSection />
        </TabsContent>

        <TabsContent value="company" className="space-y-4">
          <CompanyDataSection />
        </TabsContent>
      </div>

      {/* Mobile bottom tabs for calendar and company */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0b1320] border-t border-gray-200 dark:border-[#efc349]/30 p-2 z-40">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`p-3 rounded-lg flex items-center justify-center font-extralight ${
                activeTab === 'calendar'
                  ? 'bg-[#efc349] text-[#020817]'
                  : 'text-[#020817] dark:text-[#efc349]'
              }`}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Agenda
            </button>
            <button
              onClick={() => setActiveTab('company')}
              className={`p-3 rounded-lg flex items-center justify-center font-extralight ${
                activeTab === 'company'
                  ? 'bg-[#efc349] text-[#020817]'
                  : 'text-[#020817] dark:text-[#efc349]'
              }`}
            >
              <Building className="w-4 h-4 mr-1" />
              Empresa
            </button>
          </div>
        </div>
      )}
    </Tabs>
  );
};
