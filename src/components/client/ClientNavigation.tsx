
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
    <div className="space-y-6 pb-20">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="space-y-6">
          <TabsContent value="documents" className="space-y-0">
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

          <TabsContent value="simulations" className="space-y-0">
            <SimulationsSection />
          </TabsContent>

          <TabsContent value="announcements" className="space-y-0">
            <AnnouncementsSection />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-0">
            <FiscalCalendarSection />
          </TabsContent>

          <TabsContent value="company" className="space-y-0">
            <CompanyDataSection />
          </TabsContent>
        </div>

        {/* Barra de navegação inferior fixa */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0b1320] border-t border-gray-200 dark:border-[#efc349]/30 p-3 z-50">
          <TabsList className="grid w-full grid-cols-5 bg-white dark:bg-[#0b1320] border border-gray-200 dark:border-[#efc349]/30 h-auto">
            <TabsTrigger 
              value="documents" 
              className="font-extralight text-[#020817] dark:text-[#efc349] data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817] flex-col py-2 px-1 h-auto min-h-[50px]"
            >
              <FileText className="w-4 h-4 mb-1" />
              <span className="text-xs">Documentos</span>
            </TabsTrigger>
            <TabsTrigger 
              value="simulations" 
              className="font-extralight text-[#020817] dark:text-[#efc349] data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817] flex-col py-2 px-1 h-auto min-h-[50px]"
            >
              <Calculator className="w-4 h-4 mb-1" />
              <span className="text-xs">Simulações</span>
            </TabsTrigger>
            <TabsTrigger 
              value="announcements" 
              className="font-extralight text-[#020817] dark:text-[#efc349] data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817] flex-col py-2 px-1 h-auto min-h-[50px]"
            >
              <Megaphone className="w-4 h-4 mb-1" />
              <span className="text-xs">Comunicados</span>
            </TabsTrigger>
            <TabsTrigger 
              value="calendar" 
              className="font-extralight text-[#020817] dark:text-[#efc349] data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817] flex-col py-2 px-1 h-auto min-h-[50px]"
            >
              <Calendar className="w-4 h-4 mb-1" />
              <span className="text-xs">Agenda</span>
            </TabsTrigger>
            <TabsTrigger 
              value="company" 
              className="font-extralight text-[#020817] dark:text-[#efc349] data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817] flex-col py-2 px-1 h-auto min-h-[50px]"
            >
              <Building className="w-4 h-4 mb-1" />
              <span className="text-xs">Empresa</span>
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>
    </div>
  );
};
