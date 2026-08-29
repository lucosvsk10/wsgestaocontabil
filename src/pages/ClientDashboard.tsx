import { useState } from "react";
import { useClientDashboardLogic } from "@/components/client/dashboard/ClientDashboardContainer";
import { ClientDashboardLayout } from "@/components/client/dashboard/ClientDashboardLayout";
import { WelcomeHeader } from "@/components/client/dashboard/WelcomeHeader";
import { SimulationsSection } from "@/components/client/sections/SimulationsSection";
import { AnnouncementsSection } from "@/components/client/sections/AnnouncementsSection";
import { FiscalCalendarSection } from "@/components/client/sections/FiscalCalendarSection";
import { CompanyDataSection } from "@/components/client/sections/CompanyDataSection";
import { DocumentTable } from "@/components/client/DocumentTable";

const ClientDashboard = () => {
  const { user, documents, commonCategories, fetchUserDocuments } = useClientDashboardLogic();
  const [activeTab, setActiveTab] = useState("documents");
  const refreshDocuments = () => { if (user?.id) fetchUserDocuments(user.id); };
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("pt-BR");
  const isDocumentExpired = (expiresAt: string | null) => Boolean(expiresAt && new Date(expiresAt) < new Date());
  const daysUntilExpiration = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
    if (days < 0) return "Expirado";
    if (days === 0) return "Expira hoje";
    if (days === 1) return "Expira amanhã";
    return `${days} dias`;
  };
  const documentView = <DocumentTable documents={documents} formatDate={formatDate} isDocumentExpired={isDocumentExpired} daysUntilExpiration={daysUntilExpiration} refreshDocuments={refreshDocuments} categories={commonCategories} />;

  const renderContent = () => {
    if (activeTab === "simulations") return <SimulationsSection />;
    if (activeTab === "announcements") return <AnnouncementsSection />;
    if (activeTab === "calendar") return <FiscalCalendarSection />;
    if (activeTab === "company") return <CompanyDataSection />;
    return documentView;
  };

  return <div className="client-stage5 min-h-screen">
    <ClientDashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <WelcomeHeader />
      {renderContent()}
    </ClientDashboardLayout>
  </div>;
};
export default ClientDashboard;
