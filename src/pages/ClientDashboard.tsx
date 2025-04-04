import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
interface Document {
  id: string;
  name: string;
  file_url: string;
  uploaded_at: string;
  size?: number;
  type?: string;
  original_filename?: string;
}
const ClientDashboard = () => {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!user) return;
      try {
        const {
          data,
          error
        } = await supabase.from('documents').select('*').eq('user_id', user.id).order('uploaded_at', {
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
        setIsLoading(false);
      }
    };
    fetchDocuments();
  }, [user, toast]);

  // Função para formatar a data
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

  // Função para formatar o tamanho do arquivo
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Tamanho desconhecido';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
  };
  return <div className="min-h-screen flex flex-col bg-[#393532]">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8 bg-[_#2e2b28]">
        
        
        <Card className="py-0 bg-[#393532] mx-[10px]">
          <CardHeader className="rounded-full bg-[#393532]">
            <CardTitle className="text-[#e8cc81] font-medium uppercase tracking-wider text-xl my-0 text-center">DOCUMENTOS DISPONÍVEIS</CardTitle>
          </CardHeader>
          <CardContent className="rounded-3xl bg-[#393532]">
            {isLoading ? <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
              </div> : <>
                {documents.length > 0 ? <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome do Documento</TableHead>
                          <TableHead>Data de Envio</TableHead>
                          <TableHead>Tamanho</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map(doc => <TableRow key={doc.id}>
                            <TableCell className="font-medium">{doc.name}</TableCell>
                            <TableCell>{formatDate(doc.uploaded_at)}</TableCell>
                            <TableCell>{formatFileSize(doc.size)}</TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" asChild>
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                  <Download size={14} />
                                  <span>Baixar</span>
                                </a>
                              </Button>
                            </TableCell>
                          </TableRow>)}
                      </TableBody>
                    </Table>
                  </div> : <div className="text-center py-[20px]">
                    <File className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-lg font-medium mb-2 text-purple-400">Nenhum documento disponível</h3>
                    <p className="text-gray-400">
                      Não há documentos disponíveis para você no momento. 
                      Quando documentos forem adicionados, eles aparecerão aqui.
                    </p>
                  </div>}
              </>}
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>;
};
export default ClientDashboard;