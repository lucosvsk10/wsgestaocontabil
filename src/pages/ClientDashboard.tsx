
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, File, Calendar, Clock, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Document {
  id: string;
  name: string;
  file_url: string;
  uploaded_at: string;
  category: string;
  expires_at: string | null;
  size?: number;
  type?: string;
  original_filename?: string;
  user_id?: string;
}

// Categorias de documentos
const DOCUMENT_CATEGORIES = [
  "Impostos",
  "Documentações",
  "Certidões",
  "Folha de pagamentos"
];

const ClientDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.id)
          .order('uploaded_at', { ascending: false });
        
        if (error) throw error;
        
        // Guardar todos os documentos
        setAllDocuments(data || []);
        // Inicialmente, exibir todos os documentos
        setDocuments(data || []);
      } catch (error: any) {
        console.error('Erro ao carregar documentos:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar documentos",
          description: error.message
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDocuments();
  }, [user, toast]);

  // Filtrar documentos por categoria
  useEffect(() => {
    if (selectedCategory) {
      setDocuments(allDocuments.filter(doc => doc.category === selectedCategory));
    } else {
      setDocuments(allDocuments);
    }
  }, [selectedCategory, allDocuments]);

  // Função para formatar a data
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Data desconhecida';
    const date = new Date(dateStr);
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: pt });
  };

  // Função para formatar o tamanho do arquivo
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Tamanho desconhecido';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
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

  // Agrupar documentos por categoria
  const getDocumentsByCategory = () => {
    const groupedDocuments: Record<string, Document[]> = {};
    
    DOCUMENT_CATEGORIES.forEach(category => {
      groupedDocuments[category] = allDocuments.filter(doc => doc.category === category);
    });
    
    return groupedDocuments;
  };

  const documentsByCategory = getDocumentsByCategory();

  return (
    <div className="min-h-screen flex flex-col bg-[#393532]">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8 bg-[_#2e2b28]">
        <Card className="py-0 bg-[#393532] mx-[10px]">
          <CardHeader className="rounded-full bg-[#393532]">
            <CardTitle className="text-[#e8cc81] font-medium uppercase tracking-wider text-xl my-0 text-center">
              MEUS DOCUMENTOS
            </CardTitle>
          </CardHeader>
          
          <CardContent className="rounded-3xl bg-[#393532]">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
              </div>
            ) : (
              <>
                {allDocuments.length > 0 ? (
                  <Tabs defaultValue="all">
                    <TabsList className="mb-4">
                      <TabsTrigger value="all" onClick={() => setSelectedCategory(null)}>
                        Todos
                      </TabsTrigger>
                      {DOCUMENT_CATEGORIES.map(category => (
                        <TabsTrigger 
                          key={category} 
                          value={category}
                          onClick={() => setSelectedCategory(category)}
                          disabled={documentsByCategory[category].length === 0}
                        >
                          {category}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    <TabsContent value="all">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome do Documento</TableHead>
                              <TableHead>Categoria</TableHead>
                              <TableHead>Data de Envio</TableHead>
                              <TableHead>Validade</TableHead>
                              <TableHead>Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {documents.map(doc => (
                              <TableRow key={doc.id} className={isDocumentExpired(doc.expires_at) ? "bg-red-900/20" : ""}>
                                <TableCell className="font-medium">{doc.name}</TableCell>
                                <TableCell>
                                  <span className="flex items-center gap-1">
                                    <Tag size={14} />
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
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    asChild
                                    disabled={isDocumentExpired(doc.expires_at)}
                                  >
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
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                    
                    {DOCUMENT_CATEGORIES.map(category => (
                      <TabsContent key={category} value={category}>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nome do Documento</TableHead>
                                <TableHead>Data de Envio</TableHead>
                                <TableHead>Validade</TableHead>
                                <TableHead>Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {documentsByCategory[category].length > 0 ? (
                                documentsByCategory[category].map(doc => (
                                  <TableRow key={doc.id} className={isDocumentExpired(doc.expires_at) ? "bg-red-900/20" : ""}>
                                    <TableCell className="font-medium">{doc.name}</TableCell>
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
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        asChild
                                        disabled={isDocumentExpired(doc.expires_at)}
                                      >
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
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center py-4 text-gray-400">
                                    Não existem documentos na categoria {category}
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  <div className="text-center py-[20px]">
                    <File className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-lg font-medium mb-2 text-purple-400">Nenhum documento disponível</h3>
                    <p className="text-gray-400">
                      Não há documentos disponíveis para você no momento. 
                      Quando documentos forem adicionados, eles aparecerão aqui.
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
};

export default ClientDashboard;
