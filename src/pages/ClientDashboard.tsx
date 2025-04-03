
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, LogOut, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const ClientDashboard = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userData } = useAuth();

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });
        
      if (error) throw error;
      
      setDocuments(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar documentos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seus documentos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/login");
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado da sua conta.",
      });
    } catch (error: any) {
      console.error("Erro ao fazer logout:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao tentar sair.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    
    setIsUploading(true);
    
    try {
      // 1. Upload file to storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { data: fileData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);
        
      if (uploadError) throw uploadError;

      // 2. Get the public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // 3. Save document record in database
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          name: documentName || file.name,
          file_url: urlData.publicUrl,
          original_filename: file.name,
          size: file.size,
          type: file.type
        });
        
      if (dbError) throw dbError;
      
      // Refresh document list
      await loadDocuments();
      
      setDocumentName("");
      
      toast({
        title: "Documento enviado",
        description: "Seu documento foi enviado com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao fazer upload do documento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o documento.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gold">Minha Área</h1>
          <Button 
            onClick={handleLogout} 
            variant="outline"
            className="border-gold text-gold hover:bg-gold hover:text-navy flex items-center gap-2"
          >
            <LogOut size={16} />
            Sair
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card className="bg-gray-900 border-gray-800 mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-white">Perfil</CardTitle>
                <CardDescription className="text-gray-400">
                  Suas informações pessoais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Nome</p>
                    <p className="text-lg font-medium text-white">{userData?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-lg font-medium text-white">{user?.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white">Enviar Documento</CardTitle>
                <CardDescription className="text-gray-400">
                  Faça upload de documentos para sua conta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="document-name" className="text-white">Nome do documento</Label>
                  <Input
                    id="document-name"
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Ex: Declaração de Imposto"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="document-file" className="text-white">Arquivo</Label>
                  <div>
                    <Input
                      id="document-file"
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <Button
                      variant="outline"
                      className="w-full border-gold text-gold hover:bg-gold hover:text-navy"
                      onClick={() => document.getElementById('document-file')?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Enviando...
                        </span>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Selecionar arquivo
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-2">
            <Card className="bg-gray-900 border-gray-800 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-white flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-gold" />
                  Meus Documentos
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Documentos disponíveis em sua conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="mx-auto h-12 w-12 mb-3 opacity-30" />
                    <p className="text-lg">Nenhum documento disponível</p>
                    <p className="text-sm mt-1">Os documentos compartilhados aparecerão aqui</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {documents.map((doc) => (
                      <div key={doc.id} className="py-4 flex items-center">
                        <div className="bg-gray-800 p-2 rounded mr-4">
                          <FileText className="h-8 w-8 text-gold" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white">{doc.name}</p>
                          <p className="text-xs text-gray-400">
                            Enviado em {format(new Date(doc.uploaded_at), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gold hover:text-gold-light"
                            asChild
                          >
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              Visualizar
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-gray-800 bg-gray-900/50 mt-auto">
                <p className="text-xs text-gray-500">
                  Total de documentos: {documents.length}
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ClientDashboard;
