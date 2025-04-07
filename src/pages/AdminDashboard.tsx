
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDocumentManagement } from "@/hooks/useDocumentManagement";
import { useUserManagement } from "@/hooks/useUserManagement";
import { UserList } from "@/components/admin/UserList";
import { DocumentManager } from "@/components/admin/DocumentManager";
import { CreateUser } from "@/components/admin/CreateUser";
import { PasswordChangeForm } from "@/components/admin/PasswordChangeForm";
import { PasswordChangeModal } from "@/components/admin/PasswordChangeModal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UserType } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
    <div className="container mx-auto p-4 max-w-7xl">
      <h1 className="text-2xl font-bold mb-6 text-[#e8cc81]">Painel de Administração</h1>
      
      {showDocumentManager ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBackToUserList}
              className="flex items-center gap-1"
            >
              <ArrowLeft size={16} />
              Voltar para lista de usuários
            </Button>
            <h2 className="text-xl font-semibold text-[#e9aa91]">
              Documentos de {getSelectedUserName()}
            </h2>
          </div>
          
          <DocumentManager 
            selectedUserId={selectedUserId}
            documentName={documentName}
            setDocumentName={setDocumentName}
            documentCategory={documentCategory}
            setDocumentCategory={setDocumentCategory}
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
        </div>
      ) : (
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="users">Lista de Usuários</TabsTrigger>
            <TabsTrigger value="create-user">Criar Usuário</TabsTrigger>
            <TabsTrigger value="change-password">Alterar Senha</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="space-y-6">
            <UserList 
              supabaseUsers={supabaseUsers} 
              users={users}
              isLoading={isLoadingUsers || isLoadingAuthUsers}
              setSelectedUserId={handleDocumentButtonClick}
              setSelectedUserForPasswordChange={(user: UserType) => {
                setSelectedUserForPasswordChange(user);
                setPasswordChangeModalOpen(true);
              }}
              passwordForm={passwordForm}
              refreshUsers={refreshUsers}
            />
          </TabsContent>
          
          <TabsContent value="create-user">
            <CreateUser 
              createUser={createUser}
              isCreatingUser={isCreatingUser}
            />
          </TabsContent>
          
          <TabsContent value="change-password">
            <PasswordChangeForm />
          </TabsContent>
        </Tabs>
      )}
      
      {selectedUserForPasswordChange && (
        <PasswordChangeModal 
          selectedUserForPasswordChange={selectedUserForPasswordChange}
          setSelectedUserForPasswordChange={setSelectedUserForPasswordChange}
          changeUserPassword={changeUserPassword}
          isChangingPassword={isChangingPassword}
          passwordForm={passwordForm}
          open={passwordChangeModalOpen}
          onOpenChange={setPasswordChangeModalOpen}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
