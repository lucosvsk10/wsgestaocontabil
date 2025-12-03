
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
import { LancamentosSection } from "@/components/client/sections/LancamentosSection";
import { useDocumentActions } from "@/hooks/document/useDocumentActions";
import { DocumentTable } from "@/components/client/DocumentTable";

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
          <DocumentTable
            documents={documents}
            formatDate={(dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR')}
            isDocumentExpired={(expiresAt: string | null) => {
              if (!expiresAt) return false;
              return new Date(expiresAt) < new Date();
            }}
            daysUntilExpiration={(expiresAt: string | null) => {
              if (!expiresAt) return null;
              const days = Math.ceil((new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              if (days < 0) return "Expirado";
              if (days === 0) return "Expira hoje";
              if (days === 1) return "Expira amanhã";
              return `${days} dias`;
            }}
            refreshDocuments={refreshDocuments}
            categories={commonCategories}
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
      case "lancamentos":
        return <LancamentosSection />;
      default:
        return (
          <DocumentTable
            documents={documents}
            formatDate={(dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR')}
            isDocumentExpired={(expiresAt: string | null) => {
              if (!expiresAt) return false;
              return new Date(expiresAt) < new Date();
            }}
            daysUntilExpiration={(expiresAt: string | null) => {
              if (!expiresAt) return null;
              const days = Math.ceil((new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              if (days < 0) return "Expirado";
              if (days === 0) return "Expira hoje";
              if (days === 1) return "Expira amanhã";
              return `${days} dias`;
            }}
            refreshDocuments={refreshDocuments}
            categories={commonCategories}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#020817]">
      <ClientDashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
        {activeTab !== "lancamentos" && (
          <>
            <WelcomeHeader />
            <QuickStats onTabChange={setActiveTab} />
          </>
        )}
        {renderContent()}
      </ClientDashboardLayout>
    </div>
  );
};

export default ClientDashboard;
