
import { useState, useEffect } from "react";
import { useDocumentManagement } from "@/hooks/useDocumentManagement";
import { useUserManagement } from "@/hooks/useUserManagement";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UserType } from "@/types/admin";
import { AdminTabsView } from "@/components/admin/AdminTabsView";
import { AdminPasswordChangeModal } from "@/components/admin/AdminPasswordChangeModal";
import AdminLayout from "@/components/admin/layout/AdminLayout";
import { useSearchParams, useNavigate } from "react-router-dom";

// Schema para alteração de senha
const passwordSchema = z.object({
  password: z.string().min(6, {
    message: "A senha deve ter pelo menos 6 caracteres"
  })
});

const AdminDashboard = () => {
  // Obter parâmetros de URL
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabParam = searchParams.get("tab");
  
  // Estado para controlar se a página já carregou
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState(tabParam || "users");

  // Atualizar URL quando a aba mudar
  useEffect(() => {
    if (activeTab) {
      setSearchParams({ tab: activeTab });
    }
  }, [activeTab, setSearchParams]);

  const {
    documents,
    selectedUserId,
    setSelectedUserId,
    isUploading,
    documentName,
    setDocumentName,
    documentCategory,
    setDocumentCategory,
    documentObservations,
    setDocumentObservations,
    expirationDate,
    setExpirationDate,
    noExpiration,
    setNoExpiration,
    isLoadingDocuments,
    handleFileChange,
    handleUpload,
    handleDeleteDocument
  } = useDocumentManagement();

  const {
    users,
    supabaseUsers,
    isLoadingUsers,
    isLoadingAuthUsers,
    isCreatingUser,
    createUser,
    selectedUserForPasswordChange,
    setSelectedUserForPasswordChange,
    isChangingPassword,
    changeUserPassword,
    fetchAuthUsers,
    fetchUsers
  } = useUserManagement();

  // Categorias de documentos
  const documentCategories = ["Imposto de Renda", "Documentações", "Certidões"];

  // Form para alteração de senha
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: ""
    }
  });

  // Estado para controlar o modal de alteração de senha
  const [passwordChangeModalOpen, setPasswordChangeModalOpen] = useState(false);

  // Inicialização única ao montar o componente
  useEffect(() => {
    if (!isInitialized) {
      fetchUsers();
      fetchAuthUsers();
      setIsInitialized(true);
    }
  }, [isInitialized, fetchUsers, fetchAuthUsers]);

  useEffect(() => {
    // Sincronizar activeTab com o parâmetro de URL
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const refreshUsers = () => {
    fetchUsers();
    fetchAuthUsers();
  };

  // Function to handle document button click
  const handleDocumentButtonClick = (userId: string) => {
    setSelectedUserId(userId);
    setActiveTab("documents");
  };

  // Handler para mudança de tab que atualiza a URL
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`/admin?tab=${tab}`);
  };

  return (
    <AdminLayout>
      <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-lg shadow-md border border-gold/20">          
        <AdminTabsView 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          supabaseUsers={supabaseUsers} 
          users={users} 
          userInfoList={users}
          isLoadingUsers={isLoadingUsers} 
          isLoadingAuthUsers={isLoadingAuthUsers} 
          handleDocumentButtonClick={handleDocumentButtonClick} 
          setSelectedUserForPasswordChange={(user: UserType) => {
            setSelectedUserForPasswordChange(user);
            setPasswordChangeModalOpen(true);
          }}
          passwordForm={passwordForm} 
          refreshUsers={refreshUsers} 
          createUser={createUser} 
          isCreatingUser={isCreatingUser} 
          selectedUserId={selectedUserId}
          documentName={documentName}
          setDocumentName={setDocumentName}
          documentCategory={documentCategory}
          setDocumentCategory={setDocumentCategory}
          documentObservations={documentObservations}
          setDocumentObservations={setDocumentObservations}
          handleFileChange={handleFileChange}
          handleUpload={handleUpload}
          isUploading={isUploading}
          documents={documents}
          isLoadingDocuments={isLoadingDocuments}
          handleDeleteDocument={handleDeleteDocument}
          documentCategories={documentCategories}
          expirationDate={expirationDate}
          setExpirationDate={setExpirationDate}
          noExpiration={noExpiration}
          setNoExpiration={setNoExpiration}
        />
        
        <AdminPasswordChangeModal 
          selectedUserForPasswordChange={selectedUserForPasswordChange} 
          setSelectedUserForPasswordChange={setSelectedUserForPasswordChange} 
          changeUserPassword={changeUserPassword} 
          isChangingPassword={isChangingPassword} 
          passwordForm={passwordForm} 
          passwordChangeModalOpen={passwordChangeModalOpen} 
          setPasswordChangeModalOpen={setPasswordChangeModalOpen} 
        />
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
