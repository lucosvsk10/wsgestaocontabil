
import { useClientDashboardLogic } from "@/components/client/dashboard/ClientDashboardContainer";
import { ClientLobbyView } from "@/components/client/lobby/ClientLobbyView";

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

  return (
    <div className="min-h-screen flex flex-col bg-[#020817]">
      <ClientLobbyView
        isLoadingDocuments={isLoadingDocuments}
        isLoadingCategories={isLoadingCategories}
        documents={documents}
        documentsByCategory={documentsByCategory}
        commonCategories={commonCategories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        fetchUserDocuments={fetchUserDocuments}
        userId={user?.id || ''}
        isMobile={isMobile}
      />
    </div>
  );
};

export default ClientDashboard;
