
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDocumentManager } from "@/hooks/document/useDocumentManager";
import { useUserManagement } from "@/hooks/useUserManagement";
import AdminTabsView from "@/components/admin/AdminTabsView";
import { AdminPasswordChangeModal } from "@/components/admin/AdminPasswordChangeModal";
import AdminLayout from "@/components/admin/layout/AdminLayout";
import { useForm } from "react-hook-form";
import { useUsersFetch } from "@/hooks/useUsersFetch";

interface AdminDashboardProps {
  activeTab: string;
}

const AdminDashboard = ({
  activeTab = "dashboard"
}: AdminDashboardProps) => {
  // Estado para controlar se a página já carregou
  const [isInitialized, setIsInitialized] = useState(false);
  const {
    userId
  } = useParams<{
    userId: string;
  }>();
  const navigate = useNavigate();

  // Create a password form with react-hook-form
  const passwordForm = useForm({
    defaultValues: {
      newPassword: '',
      confirmPassword: ''
    }
  });
  
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
  
  const {
    refreshUsers
  } = useUsersFetch();
  
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
  } = useDocumentManager(users, supabaseUsers);

  // Categorias de documentos
  const documentCategories = ["Imposto de Renda", "Documentações", "Certidões"];

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

  // Function to handle document button click
  const handleDocumentButtonClick = (userId: string) => {
    navigate(`/admin/user-documents/${userId}`);
  };

  // Register user-documents param for user documents page
  useEffect(() => {
    if (activeTab === "user-documents" && userId) {
      setSelectedUserId(userId);
    }
  }, [activeTab, userId, setSelectedUserId]);

  // Wrapper functions to handle the type issues
  const handleFileChangeWrapper = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleFileChange(e);
  };

  const handleUploadWrapper = async () => {
    await handleUpload();
  };
  
  return (
    <AdminLayout>
      <AdminTabsView 
        activeTab={activeTab} 
        supabaseUsers={supabaseUsers} 
        users={users} 
        userInfoList={users} 
        isLoadingUsers={isLoadingUsers} 
        isLoadingAuthUsers={isLoadingAuthUsers} 
        handleDocumentButtonClick={handleDocumentButtonClick} 
        setSelectedUserForPasswordChange={user => {
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
        handleFileChange={handleFileChangeWrapper} 
        handleUpload={handleUploadWrapper} 
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
    </AdminLayout>
  );
};

export default AdminDashboard;
