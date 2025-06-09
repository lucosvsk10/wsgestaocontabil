
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

  const renderContent = () => {
    switch (activeTab) {
      case "documents":
        return (
          <DocumentsSection 
            documents={documents} 
            documentsByCategory={documentsByCategory} 
            categories={commonCategories} 
            onDownload={handleDownload} 
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
            onDownload={handleDownload} 
            refreshDocuments={refreshDocuments} 
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF1DE] dark:bg-[#020817]">
      <ClientDashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
        <WelcomeHeader />
        <QuickStats onTabChange={setActiveTab} />
        {renderContent()}
      </ClientDashboardLayout>
    </div>
  );
};

export default ClientDashboard;
