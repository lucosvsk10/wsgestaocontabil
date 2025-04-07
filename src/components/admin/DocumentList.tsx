
import { useState } from "react";
import { File, Clock, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Document } from "@/utils/auth/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DocumentListProps {
  documents: Document[];
  isLoading: boolean;
  handleDeleteDocument: (id: string) => Promise<void>;
}

export const DocumentList = ({ 
  documents, 
  isLoading, 
  handleDeleteDocument 
}: DocumentListProps) => {
  const { toast } = useToast();
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  
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
    if (!expiresAt) return "Não expira";
    const expirationDate = new Date(expiresAt);
    const today = new Date();
    const diffTime = expirationDate.getTime() - today.getTime();
    if (diffTime <= 0) return 'Expirado';
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} dias`;
  };

  // Função para fazer download de um documento
  const handleDownload = async (document: Document) => {
    try {
      setDownloadingIds(prev => new Set([...prev, document.id]));
      
      if (document.storage_key) {
        // Usando método de download direto se temos storage_key
        const { data, error } = await supabase.storage
          .from('documents')
          .download(document.storage_key);
          
        if (error) throw error;
        
        if (data) {
          const url = URL.createObjectURL(data);
          const a = document.createElement('a');
          a.href = url;
          a.download = document.filename || document.original_filename || document.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return;
        }
      } 
      
      // Fallback para URL pública se não conseguir baixar diretamente
      if (document.file_url) {
        window.open(document.file_url, '_blank');
      } else {
        throw new Error("URL do documento não encontrada");
      }
    } catch (error: any) {
      console.error('Erro ao baixar documento:', error);
      toast({
        variant: "destructive",
        title: "Erro ao baixar documento",
        description: error.message
      });
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(document.id);
        return newSet;
      });
    }
  };

  return (
    <div>
      <h3 className="font-medium mb-4 flex items-center">
        <File className="mr-2 h-5 w-5 text-gold" />
        Documentos do Usuário
      </h3>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome Exibido</TableHead>
                <TableHead>Arquivo Original</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Data de Envio</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length > 0 ? (
                documents.map(doc => (
                  <TableRow key={doc.id} className={isDocumentExpired(doc.expires_at) ? "bg-red-900/20" : ""}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>{doc.filename || doc.original_filename || "N/A"}</TableCell>
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
                      {doc.observations ? (
                        <span className="text-blue-400">{doc.observations}</span>
                      ) : (
                        <span className="text-gray-400 text-sm">Nenhuma</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => handleDownload(doc)}
                          disabled={downloadingIds.has(doc.id)}
                        >
                          <Download size={14} />
                          <span>Baixar</span>
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
                  <TableCell colSpan={7} className="text-center py-4 text-gray-400">
                    Nenhum documento encontrado para este usuário
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
