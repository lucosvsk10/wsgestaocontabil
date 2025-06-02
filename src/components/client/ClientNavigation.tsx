
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
    <div className="space-y-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={cn(
          "grid w-full bg-[#1a1f2e] border border-[#2a3441] rounded-xl p-1",
          isMobile ? 'grid-cols-3' : 'grid-cols-5'
        )}>
          <TabsTrigger 
            value="documents" 
            className="data-[state=active]:bg-[#F5C441] data-[state=active]:text-black text-white hover:text-[#F5C441] transition-colors"
          >
            <FileText className="w-4 h-4 mr-2" />
            {isMobile ? 'Docs' : 'Documentos'}
          </TabsTrigger>
          <TabsTrigger 
            value="simulations" 
            className="data-[state=active]:bg-[#F5C441] data-[state=active]:text-black text-white hover:text-[#F5C441] transition-colors"
          >
            <Calculator className="w-4 h-4 mr-2" />
            {isMobile ? 'Sim' : 'Simulações'}
          </TabsTrigger>
          <TabsTrigger 
            value="announcements" 
            className="data-[state=active]:bg-[#F5C441] data-[state=active]:text-black text-white hover:text-[#F5C441] transition-colors"
          >
            <Megaphone className="w-4 h-4 mr-2" />
            {isMobile ? 'Com' : 'Comunicados'}
          </TabsTrigger>
          {!isMobile && (
            <>
              <TabsTrigger 
                value="calendar" 
                className="data-[state=active]:bg-[#F5C441] data-[state=active]:text-black text-white hover:text-[#F5C441] transition-colors"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Agenda
              </TabsTrigger>
              <TabsTrigger 
                value="company" 
                className="data-[state=active]:bg-[#F5C441] data-[state=active]:text-black text-white hover:text-[#F5C441] transition-colors"
              >
                <Building className="w-4 h-4 mr-2" />
                Empresa
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <div className="mt-8">
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

        {/* Mobile bottom tabs for calendar and company */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 bg-[#1a1f2e] border-t border-[#2a3441] p-4 z-40">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setActiveTab('calendar')}
                className={cn(
                  "p-3 rounded-lg flex items-center justify-center font-medium transition-colors",
                  activeTab === 'calendar'
                    ? 'bg-[#F5C441] text-black'
                    : 'text-white hover:text-[#F5C441] hover:bg-[#F5C441]/10'
                )}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Agenda
              </button>
              <button
                onClick={() => setActiveTab('company')}
                className={cn(
                  "p-3 rounded-lg flex items-center justify-center font-medium transition-colors",
                  activeTab === 'company'
                    ? 'bg-[#F5C441] text-black'
                    : 'text-white hover:text-[#F5C441] hover:bg-[#F5C441]/10'
                )}
              >
                <Building className="w-4 h-4 mr-2" />
                Empresa
              </button>
            </div>
          </div>
        )}
      </Tabs>
    </div>
  );
};

// Helper function
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
