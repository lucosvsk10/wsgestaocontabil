
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  File, PlusCircle, Trash2, User, Users, FileText, Download, 
  Calendar, Clock, Tag, UserPlus, Lock 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger, DialogClose 
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface UserType {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  created_at: string | null;
}

interface Document {
  id: string;
  name: string;
  file_url: string;
  user_id: string;
  uploaded_at: string;
  expires_at: string | null;
  category: string;
  size?: number;
  type?: string;
  original_filename?: string;
}

// Categorias de documentos disponíveis
const DOCUMENT_CATEGORIES = [
  "Impostos",
  "Documentações",
  "Certidões",
  "Folha de pagamentos"
];

// Schema para validação de criação de usuário
const userSchema = z.object({
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
});

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

  // Form para criação de usuário
  const userForm = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      password: ""
    },
  });

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
  const createUser = async (data: z.infer<typeof userSchema>) => {
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

        userForm.reset();
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

  // Formatação da data
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Data desconhecida';
    const date = new Date(dateStr);
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: pt });
  };

  // Verificar se o documento está expirado
  const isDocumentExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const expirationDate = new Date(expiresAt);
    return expirationDate < new Date();
  };

  // Calcular dias restantes até a expiração
  const daysUntilExpiration = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const expirationDate = new Date(expiresAt);
    const today = new Date();
    const diffTime = expirationDate.getTime() - today.getTime();
    if (diffTime <= 0) return 'Expirado';
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} dias`;
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
            <Card className="px-0 bg-[#393532]">
              <CardHeader className="rounded-full bg-[#393532]">
                <CardTitle className="text-[#e8cc81] tracking-wider font-bold text-center">LISTA DE USUARIOS</CardTitle>
              </CardHeader>
              <CardContent className="rounded-full bg-[#393532]">
                {isLoadingUsers ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[#e9aa91] font-medium uppercase tracking-wider">NOME</TableHead>
                          <TableHead className="text-[#e9aa91] font-medium uppercase tracking-wider">Email</TableHead>
                          <TableHead className="text-[#e9aa91] font-medium uppercase tracking-wider">Função</TableHead>
                          <TableHead className="text-[#e9aa91] font-medium uppercase tracking-wider">Data de Cadastro</TableHead>
                          <TableHead className="text-[#e9aa91] font-medium uppercase tracking-wider">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.length > 0 ? (
                          users.map(user => (
                            <TableRow key={user.id}>
                              <TableCell>{user.name || "Sem nome"}</TableCell>
                              <TableCell>{user.email || "Sem email"}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs ${user.role === 'admin' ? 'bg-purple-900 text-purple-100' : 'bg-blue-900 text-blue-100'}`}>
                                  {user.role || "cliente"}
                                </span>
                              </TableCell>
                              <TableCell>{user.created_at ? formatDate(user.created_at) : "Data desconhecida"}</TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="flex items-center gap-1" 
                                    onClick={() => setSelectedUserId(user.id)}
                                  >
                                    <FileText size={14} />
                                    <span>Documentos</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-1"
                                    onClick={() => {
                                      setSelectedUserForPasswordChange(user);
                                      passwordForm.reset();
                                    }}
                                  >
                                    <Lock size={14} />
                                    <span>Senha</span>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-4 text-[#7d796d] bg-[in] bg-inherit">
                              Nenhum usuário encontrado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="documents">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Seleção de Usuário */}
              <Card className="md:col-span-1 bg-[#393532]">
                <CardHeader className="bg-[#393532] rounded-2xl">
                  <CardTitle className="text-[#e8cc81]">Seleção de Usuário</CardTitle>
                </CardHeader>
                <CardContent className="py-0 my-0 bg-[#393532]">
                  {isLoadingUsers ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
                    </div>
                  ) : (
                    <>
                      <p className="text-[#e9aa91]">
                        Selecione um usuário para gerenciar seus documentos
                      </p>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                        {users.map(user => (
                          <Button 
                            key={user.id} 
                            variant={selectedUserId === user.id ? "default" : "outline"} 
                            className="w-full justify-start text-left" 
                            onClick={() => setSelectedUserId(user.id)}
                          >
                            <User className="mr-2 h-4 w-4" />
                            <div className="truncate">
                              <span>{user.name || "Usuário"}</span>
                              <span className="text-xs text-gray-400 block truncate">
                                {user.email}
                              </span>
                            </div>
                          </Button>
                        ))}
                        {users.length === 0 && (
                          <p className="text-[#e9aa91]">
                            Nenhum usuário encontrado
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              
              {/* Upload de Documentos */}
              <Card className="md:col-span-2 bg-[b#393532]] bg-[#393532]">
                <CardHeader className="bg-[#393532] rounded-3xl">
                  <CardTitle className="text-[#e8cc81]">Gerenciamento de Documentos</CardTitle>
                </CardHeader>
                <CardContent className="bg-[#393532] rounded-3xl">
                  {selectedUserId ? (
                    <div className="space-y-6">
                      {/* Formulário de Upload */}
                      <div className="p-4 bg-gray-800 rounded-md">
                        <h3 className="font-medium mb-4 flex items-center">
                          <PlusCircle className="mr-2 h-5 w-5 text-gold" />
                          Enviar Novo Documento
                        </h3>
                        <form onSubmit={handleUpload} className="space-y-4">
                          <div>
                            <label htmlFor="documentName" className="block text-sm font-medium mb-1">
                              Nome do Documento
                            </label>
                            <Input 
                              id="documentName" 
                              value={documentName} 
                              onChange={e => setDocumentName(e.target.value)} 
                              className="bg-gray-700" 
                              placeholder="Ex: Contrato de Serviço" 
                              required 
                            />
                          </div>
                          <div>
                            <label htmlFor="documentCategory" className="block text-sm font-medium mb-1">
                              Categoria
                            </label>
                            <Select
                              value={documentCategory}
                              onValueChange={setDocumentCategory}
                            >
                              <SelectTrigger className="bg-gray-700">
                                <SelectValue placeholder="Selecione uma categoria" />
                              </SelectTrigger>
                              <SelectContent>
                                {DOCUMENT_CATEGORIES.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label htmlFor="fileInput" className="block text-sm font-medium mb-1">
                              Arquivo (PDF)
                            </label>
                            <Input 
                              id="fileInput" 
                              type="file" 
                              accept=".pdf" 
                              onChange={handleFileChange} 
                              className="bg-gray-700" 
                              required 
                            />
                          </div>
                          <Button 
                            type="submit" 
                            className="w-full bg-gold hover:bg-gold-light text-navy" 
                            disabled={isUploading}
                          >
                            {isUploading ? (
                              <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-navy" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Enviando...
                              </span>
                            ) : (
                              "Enviar Documento"
                            )}
                          </Button>
                        </form>
                      </div>
                      
                      {/* Lista de Documentos */}
                      <div>
                        <h3 className="font-medium mb-4 flex items-center">
                          <File className="mr-2 h-5 w-5 text-gold" />
                          Documentos do Usuário
                        </h3>
                        
                        {isLoadingDocuments ? (
                          <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nome</TableHead>
                                  <TableHead>Categoria</TableHead>
                                  <TableHead>Data de Envio</TableHead>
                                  <TableHead>Expira em</TableHead>
                                  <TableHead>Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {documents.length > 0 ? (
                                  documents.map(doc => (
                                    <TableRow key={doc.id} className={isDocumentExpired(doc.expires_at) ? "bg-red-900/20" : ""}>
                                      <TableCell className="font-medium">{doc.name}</TableCell>
                                      <TableCell>
                                        <span className="px-2 py-1 rounded-full text-xs bg-gray-700">
                                          {doc.category}
                                        </span>
                                      </TableCell>
                                      <TableCell>{formatDate(doc.uploaded_at)}</TableCell>
                                      <TableCell>
                                        <span className={`flex items-center gap-1 ${
                                          isDocumentExpired(doc.expires_at) 
                                            ? "text-red-400" 
                                            : "text-green-400"
                                        }`}>
                                          <Clock size={14} />
                                          {daysUntilExpiration(doc.expires_at)}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Button variant="outline" size="sm" asChild>
                                            <a 
                                              href={doc.file_url} 
                                              target="_blank" 
                                              rel="noopener noreferrer" 
                                              className="flex items-center gap-1"
                                            >
                                              <Download size={14} />
                                              <span>Baixar</span>
                                            </a>
                                          </Button>
                                          <Button 
                                            variant="destructive" 
                                            size="sm" 
                                            className="flex items-center gap-1" 
                                            onClick={() => handleDeleteDocument(doc.id)}
                                          >
                                            <Trash2 size={14} />
                                            <span>Excluir</span>
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4 text-gray-400">
                                      Nenhum documento encontrado para este usuário
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[#46413d]-400 bg-[#393532]">
                      <File className="h-16 w-16 mx-auto mb-4 opacity-20 bg-[inh] bg-inherit" />
                      <p className="text-[#e9aa91]">Selecione um usuário para gerenciar seus documentos</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="new-user">
            <Card className="bg-[#393532]">
              <CardHeader>
                <CardTitle className="text-[#e8cc81]">Criar Novo Usuário</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...userForm}>
                  <form onSubmit={userForm.handleSubmit(createUser)} className="space-y-4">
                    <FormField
                      control={userForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input placeholder="João da Silva" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={userForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="joao@exemplo.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={userForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="******" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isCreatingUser}
                    >
                      {isCreatingUser ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Criando...
                        </span>
                      ) : (
                        "Criar Usuário"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
      
      {/* Modal para alteração de senha */}
      <Dialog 
        open={!!selectedUserForPasswordChange} 
        onOpenChange={(open) => {
          if (!open) setSelectedUserForPasswordChange(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Alterar senha de {selectedUserForPasswordChange?.name || selectedUserForPasswordChange?.email}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(changeUserPassword)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="******" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Alterando...
                    </span>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
