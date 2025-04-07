
import { useState } from "react";
import { useDocumentManagement } from "@/hooks/useDocumentManagement";
import { useUserManagement } from "@/hooks/useUserManagement";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UserType } from "@/types/admin";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AdminTabsView } from "@/components/admin/AdminTabsView";
import { AdminDocumentView } from "@/components/admin/AdminDocumentView";
import { AdminPasswordChangeModal } from "@/components/admin/AdminPasswordChangeModal";

// Schema para alteração de senha
const passwordSchema = z.object({
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
});

const AdminDashboard = () => {
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

  // State to control whether to show document manager or user list
  const [showDocumentManager, setShowDocumentManager] = useState(false);

  // Categorias de documentos
  const documentCategories = ["Imposto de Renda", "Documentações", "Certidões"];

  // Form para alteração de senha
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
    },
  });

  // Estado para controlar o modal de alteração de senha
  const [passwordChangeModalOpen, setPasswordChangeModalOpen] = useState(false);

  const refreshUsers = () => {
    fetchUsers();
    fetchAuthUsers();
  };

  // Function to handle document button click
  const handleDocumentButtonClick = (userId: string) => {
    setSelectedUserId(userId);
    setShowDocumentManager(true);
  };

  // Function to go back to user list
  const handleBackToUserList = () => {
    setShowDocumentManager(false);
  };

  // Get selected user name for display in document manager
  const getSelectedUserName = () => {
    if (!selectedUserId) return "";
    
    const authUser = supabaseUsers.find(u => u.id === selectedUserId);
    if (!authUser) return "";
    
    const userInfo = users.find(u => u.id === selectedUserId);
    return userInfo?.name || authUser.user_metadata?.name || authUser.email || "Usuário";
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 max-w-7xl">
        <h1 className="text-2xl font-bold mb-6 text-[#e8cc81]">Painel de Administração</h1>
        
        {showDocumentManager ? (
          <AdminDocumentView 
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
            handleBackToUserList={handleBackToUserList}
            userName={getSelectedUserName()}
          />
        ) : (
          <AdminTabsView 
            supabaseUsers={supabaseUsers}
            users={users}
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
          />
        )}
        
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
      <Footer />
    </>
  );
};

export default AdminDashboard;
