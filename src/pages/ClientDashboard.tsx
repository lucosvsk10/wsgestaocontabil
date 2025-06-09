
import { useState } from "react";
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

const ClientDashboard = () => {
  const {
    user,
    documents,
    documentsByCategory,
    commonCategories,
    fetchUserDocuments
  } = useClientDashboardLogic();
  
  const { handleDownload } = useDocumentActions();
  const [activeTab, setActiveTab] = useState("documents");

  const refreshDocuments = () => {
    if (user?.id) {
      fetchUserDocuments(user.id);
    }
  };

  // Create a wrapper function that finds the document by ID and calls handleDownload
  const handleDownloadById = (documentId: string) => {
    const document = documents.find(doc => doc.id === documentId);
    if (document) {
      handleDownload(document);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "documents":
        return (
          <DocumentsSection 
            documents={documents} 
            documentsByCategory={documentsByCategory} 
            categories={commonCategories} 
            onDownload={handleDownloadById} 
            refreshDocuments={refreshDocuments} 
          />
        );
      case "simulations":
        return <SimulationsSection />;
      case "announcements":
        return <AnnouncementsSection />;
      case "calendar":
        return <FiscalCalendarSection />;
      case "company":
        return <CompanyDataSection />;
      default:
        return (
          <DocumentsSection 
            documents={documents} 
            documentsByCategory={documentsByCategory} 
            categories={commonCategories} 
            onDownload={handleDownloadById} 
            refreshDocuments={refreshDocuments} 
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF1DE] dark:bg-[#020817]">
      <ClientDashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
        <div className="space-y-6">
          <WelcomeHeader />
          <QuickStats />
          
          {/* Conteúdo principal com fundo elegante */}
          <div className="bg-white dark:bg-[#0b1320] border border-[#e6e6e6] dark:border-[#efc349]/20 rounded-2xl p-6 shadow-sm">
            {renderContent()}
          </div>
        </div>
      </ClientDashboardLayout>
    </div>
  );
};

export default ClientDashboard;
