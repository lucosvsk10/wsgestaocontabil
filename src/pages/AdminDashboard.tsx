import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { File, PlusCircle, Trash2, User, Users, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  size?: number;
  type?: string;
  original_filename?: string;
}
const AdminDashboard = () => {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [users, setUsers] = useState<UserType[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

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
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  return <div className="min-h-screen flex flex-col bg-[#46413d]">
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
          </TabsList>
          
          <TabsContent value="users">
            <Card className="px-0 bg-[#393532]">
              <CardHeader className="rounded-full bg-[#393532]">
                <CardTitle className="text-[#efc349] tracking-wider font-bold">LISTA DE USUARIOS</CardTitle>
              </CardHeader>
              <CardContent className="rounded-full bg-[#393532]">
                {isLoadingUsers ? <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
                  </div> : <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[#e8cc81] font-medium uppercase tracking-wider">Nome</TableHead>
                          <TableHead className="text-[#e8cc81] font-medium uppercase tracking-wider">Email</TableHead>
                          <TableHead className="text-[#e8cc81] font-medium uppercase tracking-wider">Função</TableHead>
                          <TableHead className="text-[#e8cc81] font-medium uppercase tracking-wider">Data de Cadastro</TableHead>
                          <TableHead className="text-[#e8cc81] font-medium uppercase tracking-wider">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.length > 0 ? users.map(user => <TableRow key={user.id}>
                              <TableCell>{user.name || "Sem nome"}</TableCell>
                              <TableCell>{user.email || "Sem email"}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs ${user.role === 'admin' ? 'bg-purple-900 text-purple-100' : 'bg-blue-900 text-blue-100'}`}>
                                  {user.role || "cliente"}
                                </span>
                              </TableCell>
                              <TableCell>{user.created_at ? formatDate(user.created_at) : "Data desconhecida"}</TableCell>
                              <TableCell>
                                <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => setSelectedUserId(user.id)}>
                                  <FileText size={14} />
                                  <span>Ver Documentos</span>
                                </Button>
                              </TableCell>
                            </TableRow>) : <TableRow>
                            <TableCell colSpan={5} className="text-center py-4 text-[#7d796d] bg-[in] bg-inherit">
                              Nenhum usuário encontrado
                            </TableCell>
                          </TableRow>}
                      </TableBody>
                    </Table>
                  </div>}
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
                  {isLoadingUsers ? <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
                    </div> : <>
                      <p className="text-[#e9aa91]">
                        Selecione um usuário para gerenciar seus documentos
                      </p>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                        {users.map(user => <Button key={user.id} variant={selectedUserId === user.id ? "default" : "outline"} className="w-full justify-start text-left" onClick={() => setSelectedUserId(user.id)}>
                            <User className="mr-2 h-4 w-4" />
                            <div className="truncate">
                              <span>{user.name || "Usuário"}</span>
                              <span className="text-xs text-gray-400 block truncate">
                                {user.email}
                              </span>
                            </div>
                          </Button>)}
                        {users.length === 0 && <p className="text-[#e9aa91]">
                            Nenhum usuário encontrado
                          </p>}
                      </div>
                    </>}
                </CardContent>
              </Card>
              
              {/* Upload de Documentos */}
              <Card className="md:col-span-2 bg-[#efc349]">
                <CardHeader className="bg-[#393532]">
                  <CardTitle className="text-[#e8cc81]">Gerenciamento de Documentos</CardTitle>
                </CardHeader>
                <CardContent className="bg-[#393532]">
                  {selectedUserId ? <div className="space-y-6">
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
                            <Input id="documentName" value={documentName} onChange={e => setDocumentName(e.target.value)} className="bg-gray-700" placeholder="Ex: Contrato de Serviço" required />
                          </div>
                          <div>
                            <label htmlFor="fileInput" className="block text-sm font-medium mb-1">
                              Arquivo (PDF)
                            </label>
                            <Input id="fileInput" type="file" accept=".pdf" onChange={handleFileChange} className="bg-gray-700" required />
                          </div>
                          <Button type="submit" className="w-full bg-gold hover:bg-gold-light text-navy" disabled={isUploading}>
                            {isUploading ? <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-navy" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Enviando...
                              </span> : "Enviar Documento"}
                          </Button>
                        </form>
                      </div>
                      
                      {/* Lista de Documentos */}
                      <div>
                        <h3 className="font-medium mb-4 flex items-center">
                          <File className="mr-2 h-5 w-5 text-gold" />
                          Documentos do Usuário
                        </h3>
                        
                        {isLoadingDocuments ? <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
                          </div> : <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nome</TableHead>
                                  <TableHead>Data de Envio</TableHead>
                                  <TableHead>Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {documents.length > 0 ? documents.map(doc => <TableRow key={doc.id}>
                                      <TableCell className="font-medium">{doc.name}</TableCell>
                                      <TableCell>{formatDate(doc.uploaded_at)}</TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Button variant="outline" size="sm" asChild>
                                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                              <Download size={14} />
                                              <span>Baixar</span>
                                            </a>
                                          </Button>
                                          <Button variant="destructive" size="sm" className="flex items-center gap-1" onClick={() => handleDeleteDocument(doc.id)}>
                                            <Trash2 size={14} />
                                            <span>Excluir</span>
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>) : <TableRow>
                                    <TableCell colSpan={3} className="text-center py-4 text-gray-400">
                                      Nenhum documento encontrado para este usuário
                                    </TableCell>
                                  </TableRow>}
                              </TableBody>
                            </Table>
                          </div>}
                      </div>
                    </div> : <div className="text-center py-8 text-[#46413d]-400 bg-[#393532]">
                      <File className="h-16 w-16 mx-auto mb-4 opacity-20 bg-[inh] bg-inherit" />
                      <p className="text-[#e9aa91]">Selecione um usuário para gerenciar seus documentos</p>
                    </div>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>;
};
export default AdminDashboard;