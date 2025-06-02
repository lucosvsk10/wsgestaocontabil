
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useClientDashboardLogic } from "@/components/client/dashboard/ClientDashboardContainer";
import { ClientDashboardContent } from "@/components/client/dashboard/ClientDashboardContent";

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
      <Navbar />
      <ClientDashboardContent
        isLoadingDocuments={isLoadingDocuments}
        isLoadingCategories={isLoadingCategories}
        documents={documents}
        documentsByCategory={documentsByCategory}
        commonCategories={commonCategories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        fetchUserDocuments={fetchUserDocuments}
        userId={user?.id || ''}
      />
      <Footer />
    </div>
  );
};

export default ClientDashboard;
