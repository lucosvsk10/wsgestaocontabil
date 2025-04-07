
import { useState } from "react";
import { Download, Clock, Bell, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Document } from "@/utils/auth/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CategoryDocumentTableProps {
  documents: Document[];
  category: string;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expirationDate: string | null) => boolean;
  daysUntilExpiration: (expirationDate: string | null) => string | null;
  refreshDocuments: () => void;
}

export const CategoryDocumentTable = ({ 
  documents, 
  category,
  formatDate, 
  isDocumentExpired, 
  daysUntilExpiration,
  refreshDocuments
}: CategoryDocumentTableProps) => {
  const { toast } = useToast();
  const [loadingDocumentIds, setLoadingDocumentIds] = useState<Set<string>>(new Set());

  const markAsViewed = async (docItem: Document) => {
    // If already viewed, no need to update
    if (docItem.viewed) return;
    
    try {
      setLoadingDocumentIds(prev => new Set([...prev, docItem.id]));
      
      const { error } = await supabase
        .from('documents')
        .update({ viewed: true })
        .eq('id', docItem.id);
        
      if (error) throw error;
      
      // Refresh the documents list
      refreshDocuments();
    } catch (error: any) {
      console.error('Error marking document as viewed:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível marcar o documento como visualizado."
      });
    } finally {
      setLoadingDocumentIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(docItem.id);
        return newSet;
      });
    }
  };

  const handleDownload = async (docItem: Document) => {
    // Mark as viewed when downloaded
    markAsViewed(docItem);
    
    try {
      if (docItem.storage_key) {
        // Se temos o storage_key, usar o método de download
        const { data, error } = await supabase.storage
          .from('documents')
          .download(docItem.storage_key);
        
        if (error) throw error;
        
        if (data) {
          // Criar URL do blob e iniciar download
          const url = URL.createObjectURL(data);
          const a = window.document.createElement('a');
          a.href = url;
          a.download = docItem.filename || docItem.original_filename || docItem.name;
          window.document.body.appendChild(a);
          a.click();
          window.document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } else if (docItem.file_url) {
        // Fallback para URL pública
        window.open(docItem.file_url, '_blank');
      }
    } catch (error: any) {
      console.error('Erro ao baixar documento:', error);
      toast({
        variant: "destructive",
        title: "Erro ao baixar documento",
        description: error.message
      });
    }
  };

  // Count new documents
  const newDocumentsCount = documents.filter(doc => !doc.viewed).length;

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center mb-4">
        <h3 className="text-lg font-medium">{category}</h3>
        {newDocumentsCount > 0 && (
          <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1">
            {newDocumentsCount} novo{newDocumentsCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome do Documento</TableHead>
            <TableHead>Data de Envio</TableHead>
            <TableHead>Validade</TableHead>
            <TableHead>Observações</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length > 0 ? (
            documents.map(doc => (
              <TableRow key={doc.id} className={isDocumentExpired(doc.expires_at) ? "bg-red-900/20" : ""}>
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    {!doc.viewed && (
                      <Bell size={14} className="text-red-500 mr-2" />
                    )}
                    {doc.name}
                  </div>
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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center text-blue-400 cursor-help">
                            <Info size={14} className="mr-1" />
                            <span className="truncate max-w-[150px]">{doc.observations}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-[300px] whitespace-normal break-words">{doc.observations}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-gray-400 text-sm">Nenhuma</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={isDocumentExpired(doc.expires_at) || loadingDocumentIds.has(doc.id)}
                    onClick={() => handleDownload(doc)}
                    className="flex items-center gap-1"
                  >
                    <Download size={14} />
                    <span>{doc.filename || doc.original_filename || "Baixar"}</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-4 text-gray-400">
                Não existem documentos na categoria {category}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
