
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserList } from "@/components/admin/UserList";
import { UserSelector } from "@/components/admin/UserSelector";
import { DocumentManager } from "@/components/admin/DocumentManager";
import { CreateUser } from "@/components/admin/CreateUser";
import { PasswordChangeModal } from "@/components/admin/PasswordChangeModal";
import { UserType, Document } from "@/types/admin";
import { Users, FileText, UserPlus } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
  const { toast } = useToast();
  const [users, setUsers] = useState<UserType[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [documentCategory, setDocumentCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [selectedUserForPasswordChange, setSelectedUserForPasswordChange] = useState<UserType | null>(null);

  // Form para alteração de senha
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: ""
    },
  });

  // Carregar usuários
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const {
          data,
          error
        } = await supabase.from('users').select('*').order('created_at', {
          ascending: false
        });
        if (error) throw error;
        setUsers(data || []);
      } catch (error: any) {
        console.error('Erro ao carregar usuários:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar usuários",
          description: error.message
        });
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [toast]);

  // Carregar documentos do usuário selecionado
  useEffect(() => {
    if (selectedUserId) {
      fetchUserDocuments(selectedUserId);
    } else {
      setDocuments([]);
    }
  }, [selectedUserId]);

  // Função para buscar documentos de um usuário específico
  const fetchUserDocuments = async (userId: string) => {
    setIsLoadingDocuments(true);
    try {
      const {
        data,
        error
      } = await supabase.from('documents').select('*').eq('user_id', userId).order('uploaded_at', {
        ascending: false
      });
      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar documentos:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar documentos",
        description: error.message
      });
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  // Função para criar um novo usuário
  const createUser = async (data: z.infer<typeof z.object({
    name: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6),
  })>) => {
    setIsCreatingUser(true);
    try {
      // 1. Registrar o usuário no Auth
      const {
        error: signUpError,
        data: authData
      } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (signUpError) throw signUpError;

      if (authData?.user) {
        // 2. Adicionar informações do usuário na tabela users
        const {
          error: profileError
        } = await supabase.from('users').insert({
          id: authData.user.id,
          email: data.email,
          name: data.name,
          role: 'client',
        });

        if (profileError) throw profileError;

        // 3. Atualizar a lista de usuários
        const {
          data: updatedUsers,
          error: fetchError
        } = await supabase.from('users').select('*').order('created_at', {
          ascending: false
        });

        if (fetchError) throw fetchError;
        setUsers(updatedUsers || []);

        toast({
          title: "Usuário criado com sucesso",
          description: `${data.name} (${data.email}) foi cadastrado no sistema.`
        });
      }
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar usuário",
        description: error.message
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Função para alterar a senha de um usuário
  const changeUserPassword = async (data: z.infer<typeof passwordSchema>) => {
    if (!selectedUserForPasswordChange) return;
    
    setIsChangingPassword(true);
    try {
      const response = await fetch(`https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/update-user-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          userId: selectedUserForPasswordChange.id,
          newPassword: data.password
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao alterar senha');
      }

      toast({
        title: "Senha alterada com sucesso",
        description: `A senha de ${selectedUserForPasswordChange.name || selectedUserForPasswordChange.email} foi atualizada.`
      });

      passwordForm.reset();
      setSelectedUserForPasswordChange(null);
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      toast({
        variant: "destructive",
        title: "Erro ao alterar senha",
        description: error.message
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Função para lidar com o upload de arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      if (!documentName) {
        setDocumentName(e.target.files[0].name);
      }
    }
  };

  // Função para enviar documento
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar documento",
        description: "Nenhum usuário selecionado."
      });
      return;
    }
    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar documento",
        description: "Nenhum arquivo selecionado."
      });
      return;
    }
    if (!documentName.trim()) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar documento",
        description: "Nome do documento é obrigatório."
      });
      return;
    }
    if (!documentCategory) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar documento",
        description: "Categoria do documento é obrigatória."
      });
      return;
    }
    
    setIsUploading(true);
    try {
      // 1. Upload do arquivo para o Storage
      const filePath = `${selectedUserId}/${Date.now()}_${selectedFile.name}`;
      const {
        data: fileData,
        error: uploadError
      } = await supabase.storage.from('documents').upload(filePath, selectedFile);
      if (uploadError) throw uploadError;

      // 2. Obter URL pública do arquivo
      const {
        data: urlData
      } = supabase.storage.from('documents').getPublicUrl(filePath);

      // 3. Salvar informações do documento no banco de dados
      const {
        data,
        error: dbError
      } = await supabase.from('documents').insert({
        user_id: selectedUserId,
        name: documentName,
        category: documentCategory,
        file_url: urlData.publicUrl,
        original_filename: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type
      }).select();
      if (dbError) throw dbError;

      // 4. Atualizar lista de documentos
      await fetchUserDocuments(selectedUserId);

      // 5. Limpar formulário
      setSelectedFile(null);
      setDocumentName("");
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      toast({
        title: "Documento enviado com sucesso",
        description: "O documento foi enviado e está disponível para o usuário."
      });
    } catch (error: any) {
      console.error('Erro ao enviar documento:', error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar documento",
        description: error.message
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Função para excluir documento
  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este documento?")) {
      return;
    }
    try {
      // 1. Buscar informações do documento para obter o caminho do arquivo
      const {
        data: docData,
        error: fetchError
      } = await supabase.from('documents').select('*').eq('id', documentId).single();
      if (fetchError) throw fetchError;

      // 2. Excluir documento do banco de dados
      const {
        error: deleteDbError
      } = await supabase.from('documents').delete().eq('id', documentId);
      if (deleteDbError) throw deleteDbError;

      // 3. Excluir arquivo do Storage (se possível obter o caminho)
      if (docData && docData.file_url) {
        const url = new URL(docData.file_url);
        const pathArray = url.pathname.split('/');
        const storagePath = pathArray.slice(pathArray.indexOf('documents') + 1).join('/');
        if (storagePath) {
          const {
            error: deleteStorageError
          } = await supabase.storage.from('documents').remove([storagePath]);
          if (deleteStorageError) {
            console.error('Erro ao excluir arquivo do storage:', deleteStorageError);
            // Continuamos mesmo com erro no storage pois o registro já foi excluído
          }
        }
      }

      // 4. Atualizar lista de documentos
      if (selectedUserId) {
        await fetchUserDocuments(selectedUserId);
      }
      toast({
        title: "Documento excluído com sucesso",
        description: "O documento foi removido permanentemente."
      });
    } catch (error: any) {
      console.error('Erro ao excluir documento:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir documento",
        description: error.message
      });
    }
  };

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
          </TabsList>
          
          <TabsContent value="users">
            <UserList 
              users={users}
              isLoading={isLoadingUsers}
              setSelectedUserId={setSelectedUserId}
              setSelectedUserForPasswordChange={setSelectedUserForPasswordChange}
              passwordForm={passwordForm}
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
              />
            </div>
          </TabsContent>
          
          <TabsContent value="new-user">
            <CreateUser 
              createUser={createUser}
              isCreatingUser={isCreatingUser}
            />
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
