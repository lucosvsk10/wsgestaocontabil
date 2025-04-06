import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserList } from "@/components/admin/UserList";
import { UserSelector } from "@/components/admin/UserSelector";
import { DocumentManager } from "@/components/admin/DocumentManager";
import { CreateUser } from "@/components/admin/CreateUser";
import { PasswordChangeModal } from "@/components/admin/PasswordChangeModal";
import { PasswordChangeForm } from "@/components/admin/PasswordChangeForm";
import { Users, FileText, UserPlus, Key } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useUserManagement } from "@/hooks/useUserManagement";
import { useDocumentManagement } from "@/hooks/useDocumentManagement";

// Categorias de documentos disponíveis
const DOCUMENT_CATEGORIES = [
  "Impostos",
  "Documentações",
  "Certidões",
  "Folha de pagamentos"
];

// Schema para alteração de senha
const passwordSchema = z.object({
  password: z.string().min(6, { message: "A nova senha deve ter pelo menos 6 caracteres" }),
});

const AdminDashboard = () => {
  const { user } = useAuth();
  
  // Gerenciamento de usuários
  const {
    users,
    supabaseUsers,
    isLoadingUsers,
    isLoadingAuthUsers,
    isCreatingUser,
    isChangingPassword,
    selectedUserForPasswordChange,
    setSelectedUserForPasswordChange,
    createUser,
    changeUserPassword,
    fetchAuthUsers
  } = useUserManagement();

  // Gerenciamento de documentos
  const {
    documents,
    selectedUserId,
    setSelectedUserId,
    isUploading,
    documentName,
    setDocumentName,
    documentCategory,
    setDocumentCategory,
    isLoadingDocuments,
    expirationDate, 
    setExpirationDate,
    noExpiration,
    setNoExpiration,
    handleFileChange,
    handleUpload,
    handleDeleteDocument
  } = useDocumentManagement();

  // Form para alteração de senha
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: ""
    },
  });

  const isLoading = isLoadingUsers || isLoadingAuthUsers;

  return (
    <div className="min-h-screen flex flex-col bg-[#46413d]">
      <Navbar />
      
      <main className="flex-grow container mx-auto py-8 bg-[#46413d] px-[100px]">
        <h1 className="text-3xl mb-6 font- font-extrabold text-[#efc349] text-center">PAINEL ADMINISTRATIVO</h1>
        
        <Tabs defaultValue="users">
          <TabsList className="mb-6 bg-[itext-white] bg-[#2e2b28]">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users size={16} />
              <span>Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText size={16} />
              <span className="">Documentos</span>
            </TabsTrigger>
            <TabsTrigger value="new-user" className="flex items-center gap-2">
              <UserPlus size={16} />
              <span>Criar Usuário</span>
            </TabsTrigger>
            <TabsTrigger value="password-change" className="flex items-center gap-2">
              <Key size={16} />
              <span>Alterar Senha</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="users">
            <UserList 
              supabaseUsers={supabaseUsers}
              users={users}
              isLoading={isLoading}
              setSelectedUserId={setSelectedUserId}
              setSelectedUserForPasswordChange={setSelectedUserForPasswordChange}
              passwordForm={passwordForm}
              refreshUsers={fetchAuthUsers}
            />
          </TabsContent>
          
          <TabsContent value="documents">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Seleção de Usuário */}
              <UserSelector 
                users={users}
                selectedUserId={selectedUserId}
                setSelectedUserId={setSelectedUserId}
                isLoadingUsers={isLoadingUsers}
              />
              
              {/* Gerenciamento de Documentos */}
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
                documentCategories={DOCUMENT_CATEGORIES}
                expirationDate={expirationDate}
                setExpirationDate={setExpirationDate}
                noExpiration={noExpiration}
                setNoExpiration={setNoExpiration}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="new-user">
            <CreateUser 
              createUser={createUser}
              isCreatingUser={isCreatingUser}
            />
          </TabsContent>

          <TabsContent value="password-change">
            <PasswordChangeForm />
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
      
      {/* Modal para alteração de senha */}
      <PasswordChangeModal 
        selectedUserForPasswordChange={selectedUserForPasswordChange}
        setSelectedUserForPasswordChange={setSelectedUserForPasswordChange}
        changeUserPassword={changeUserPassword}
        isChangingPassword={isChangingPassword}
        passwordForm={passwordForm}
      />
    </div>
  );
};

export default AdminDashboard;
