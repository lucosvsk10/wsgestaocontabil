
import { useState } from "react";
import { File, Clock, Download, Trash2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Document } from "@/types/admin";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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

  // Date formatting
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Data desconhecida';
    try {
      const date = new Date(dateStr);
      return format(date, "dd/MM/yyyy 'às' HH:mm", {
        locale: pt
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'Data inválida';
    }
  };

  // Check if document is expired
  const isDocumentExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    try {
      const expirationDate = new Date(expiresAt);
      return expirationDate < new Date();
    } catch (error) {
      console.error("Error checking expiration:", error);
      return false;
    }
  };

  // Calculate days until expiration
  const daysUntilExpiration = (expiresAt: string | null) => {
    if (!expiresAt) return "Não expira";
    try {
      const expirationDate = new Date(expiresAt);
      const today = new Date();
      const diffTime = expirationDate.getTime() - today.getTime();
      if (diffTime <= 0) return 'Expirado';
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays} dias`;
    } catch (error) {
      console.error("Error calculating days until expiration:", error);
      return "Erro no cálculo";
    }
  };

  // Function to download document 
  const handleDownload = async (docItem: Document) => {
    try {
      setDownloadingIds(prev => new Set([...prev, docItem.id]));
      if (docItem.storage_key) {
        // Usando método de download direto se temos storage_key
        const {
          data,
          error
        } = await supabase.storage.from('documents').download(docItem.storage_key);
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

  const getStatusBadge = (doc: Document) => {
    if (doc.status === 'expired') {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Expirado
        </Badge>
      );
    }
    if (isDocumentExpired(doc.expires_at)) {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Expirado
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-gold/30 bg-white dark:bg-transparent shadow-sm">
      <h3 className="font-medium mb-4 flex items-center text-gray-800 dark:text-gold">
        <File className="mr-2 h-5 w-5 text-navy dark:text-gold" />
        Documentos do Usuário
      </h3>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy dark:border-gold"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 dark:border-gold/30">
                <TableHead className="text-navy dark:text-[#d9d9d9]">Nome Exibido</TableHead>
                <TableHead className="text-navy dark:text-[#d9d9d9]">Arquivo Original</TableHead>
                <TableHead className="text-navy dark:text-[#d9d9d9]">Categoria</TableHead>
                <TableHead className="text-navy dark:text-[#d9d9d9]">Data de Envio</TableHead>
                <TableHead className="text-navy dark:text-[#d9d9d9]">Status</TableHead>
                <TableHead className="text-navy dark:text-[#d9d9d9]">Expira em</TableHead>
                <TableHead className="text-navy dark:text-[#d9d9d9]">Observações</TableHead>
                <TableHead className="text-navy dark:text-[#d9d9d9]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents && documents.length > 0 ? (
                documents.map(doc => (
                  <TableRow 
                    key={doc.id} 
                    className={
                      doc.status === 'expired' || isDocumentExpired(doc.expires_at)
                        ? "bg-red-50 dark:bg-transparent dark:border-red-800/30 border-gray-200 dark:border-gold/20" 
                        : "border-gray-200 dark:border-gold/30 hover:bg-gray-50 dark:hover:bg-deepNavy/50"
                    }
                  >
                    <TableCell className="font-medium text-gray-800 dark:text-[#d9d9d9]">
                      <div className="flex items-center gap-2">
                        {doc.name}
                        {getStatusBadge(doc)}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-[#d9d9d9]">{doc.filename || doc.original_filename || "N/A"}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs bg-navy text-white dark:bg-transparent dark:border dark:border-gold/40 dark:text-[#d9d9d9]">
                        {doc.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-[#d9d9d9]">{formatDate(doc.uploaded_at)}</TableCell>
                    <TableCell>
                      {doc.viewed ? (
                        <div className="flex items-center text-green-600 dark:text-green-400">
                          <Eye size={14} className="mr-1" />
                          <span>Visualizado</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-blue-600 dark:text-blue-400">
                          <EyeOff size={14} className="mr-1" />
                          <span>Não visualizado</span>
                          <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800 dark:bg-transparent dark:border dark:border-blue-500/30 dark:text-blue-400 text-xs">Novo</Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`flex items-center gap-1 ${
                        doc.status === 'expired' || isDocumentExpired(doc.expires_at)
                          ? "text-red-600 dark:text-red-400" 
                          : "text-green-600 dark:text-green-400"
                      }`}>
                        <Clock size={14} />
                        {doc.status === 'expired' ? 'Expirado (Sistema)' : daysUntilExpiration(doc.expires_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {doc.observations ? (
                        <span className="text-blue-600 dark:text-blue-400">{doc.observations}</span>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center gap-1 border-navy/20 text-navy hover:bg-navy hover:text-white dark:border-gold/30 dark:text-gold dark:hover:bg-gold/10 dark:hover:text-gold" 
                          onClick={() => handleDownload(doc)} 
                          disabled={downloadingIds.has(doc.id) || doc.status === 'expired'}
                        >
                          <Download size={14} />
                          <span>Baixar</span>
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="flex items-center gap-1 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-transparent dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-900/20" 
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
                <TableRow className="border-gray-200 dark:border-gold/30">
                  <TableCell colSpan={8} className="text-center py-4 text-navy dark:text-gold">
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
