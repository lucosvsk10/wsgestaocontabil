
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
  const handleDownload = async (docItem: Document) => {
    try {
      setDownloadingIds(prev => new Set([...prev, docItem.id]));
      
      if (docItem.storage_key) {
        // Usando método de download direto se temos storage_key
        const { data, error } = await supabase.storage
          .from('documents')
          .download(docItem.storage_key);
          
        if (error) throw error;
        
        if (data) {
          const url = URL.createObjectURL(data);
          const a = window.document.createElement('a');
          a.href = url;
          a.download = docItem.filename || docItem.original_filename || docItem.name;
          window.document.body.appendChild(a);
          a.click();
          window.document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return;
        }
      } 
      
      // Fallback para URL pública se não conseguir baixar diretamente
      if (docItem.file_url) {
        window.open(docItem.file_url, '_blank');
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
        newSet.delete(docItem.id);
        return newSet;
      });
    }
  };

  return (
    <div className="bg-[#393532] p-4 rounded-lg border border-gold/20">
      <h3 className="font-medium mb-4 flex items-center text-gold">
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
              <TableRow className="border-gold/20">
                <TableHead className="text-gold">Nome Exibido</TableHead>
                <TableHead className="text-gold">Arquivo Original</TableHead>
                <TableHead className="text-gold">Categoria</TableHead>
                <TableHead className="text-gold">Data de Envio</TableHead>
                <TableHead className="text-gold">Expira em</TableHead>
                <TableHead className="text-gold">Observações</TableHead>
                <TableHead className="text-gold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length > 0 ? (
                documents.map(doc => (
                  <TableRow key={doc.id} className={isDocumentExpired(doc.expires_at) ? "bg-red-900/20 border-gold/20" : "border-gold/20 hover:bg-[#46413d]"}>
                    <TableCell className="font-medium text-white">{doc.name}</TableCell>
                    <TableCell className="text-white">{doc.filename || doc.original_filename || "N/A"}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs bg-gold text-navy">
                        {doc.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-white">{formatDate(doc.uploaded_at)}</TableCell>
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
                          className="flex items-center gap-1 border-gold/20 text-gold hover:bg-gold hover:text-navy"
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
                <TableRow className="border-gold/20">
                  <TableCell colSpan={7} className="text-center py-4 text-gold">
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
