
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useClientDashboardLogic } from "@/components/client/dashboard/ClientDashboardContainer";
import { ClientDashboardLayout } from "@/components/client/dashboard/ClientDashboardLayout";
import { WelcomeHeader } from "@/components/client/dashboard/WelcomeHeader";
import { QuickStats } from "@/components/client/dashboard/QuickStats";
import { DocumentsSection } from "@/components/client/sections/DocumentsSection";
import { SimulationsSection } from "@/components/client/sections/SimulationsSection";
import { AnnouncementsSection } from "@/components/client/sections/AnnouncementsSection";
import { FiscalCalendarSection } from "@/components/client/sections/FiscalCalendarSection";
import { CompanyDataSection } from "@/components/client/sections/CompanyDataSection";
import { useDocumentActions } from "@/hooks/document/useDocumentActions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Calculator, Bell, Calendar, Building2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const ClientDashboard = () => {
  const {
    user,
    selectedCategory,
    setSelectedCategory,
    isMobile,
    documents,
    isLoadingDocuments,
    isLoadingCategories,
    fetchUserDocuments,
    commonCategories,
    documentsByCategory
  } = useClientDashboardLogic();

  const { handleDownload } = useDocumentActions();
  const [activeTab, setActiveTab] = useState("documents");

  const refreshDocuments = () => {
    if (user?.id) {
      fetchUserDocuments(user.id);
    }
  };

  return (
    <div className="min-h-screen bg-[#020817]">
      <Navbar />
      <ClientDashboardLayout>
        <WelcomeHeader />
        
        <QuickStats 
          documentsCount={documents.length}
          simulationsCount={0} // Will be fetched in SimulationsSection
          announcementsCount={0} // Will be fetched in AnnouncementsSection  
          upcomingEvents={0} // Will be fetched in FiscalCalendarSection
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-[#0b1320] border border-[#efc349]/20 mb-6">
            <TabsTrigger 
              value="documents" 
              className="text-white data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817] font-extralight"
            >
              <FileText className="w-4 h-4 mr-1" />
              {isMobile ? 'Docs' : 'Documentos'}
            </TabsTrigger>
            <TabsTrigger 
              value="simulations"
              className="text-white data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817] font-extralight"
            >
              <Calculator className="w-4 h-4 mr-1" />
              {isMobile ? 'Sim' : 'Simulações'}
            </TabsTrigger>
            <TabsTrigger 
              value="announcements"
              className="text-white data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817] font-extralight"
            >
              <Bell className="w-4 h-4 mr-1" />
              {isMobile ? 'Com' : 'Comunicados'}
            </TabsTrigger>
            <TabsTrigger 
              value="calendar"
              className="text-white data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817] font-extralight"
            >
              <Calendar className="w-4 h-4 mr-1" />
              {isMobile ? 'Agenda' : 'Agenda'}
            </TabsTrigger>
            <TabsTrigger 
              value="company"
              className="text-white data-[state=active]:bg-[#efc349] data-[state=active]:text-[#020817] font-extralight"
            >
              <Building2 className="w-4 h-4 mr-1" />
              {isMobile ? 'Empresa' : 'Empresa'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents">
            <DocumentsSection
              documents={documents}
              documentsByCategory={documentsByCategory}
              categories={commonCategories}
              onDownload={handleDownload}
              refreshDocuments={refreshDocuments}
            />
          </TabsContent>

          <TabsContent value="simulations">
            <SimulationsSection />
          </TabsContent>

          <TabsContent value="announcements">
            <AnnouncementsSection />
          </TabsContent>

          <TabsContent value="calendar">
            <FiscalCalendarSection />
          </TabsContent>

          <TabsContent value="company">
            <CompanyDataSection />
          </TabsContent>
        </Tabs>
      </ClientDashboardLayout>
      <Footer />
    </div>
  );
};

export default ClientDashboard;
