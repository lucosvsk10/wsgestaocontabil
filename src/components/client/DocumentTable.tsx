
import { useState } from "react";
import { Download, Clock, Tag, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Document } from "@/types/admin";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DocumentTableProps {
  documents: Document[];
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
}

export const DocumentTable = ({ 
  documents, 
  formatDate, 
  isDocumentExpired, 
  daysUntilExpiration,
  refreshDocuments
}: DocumentTableProps) => {
  const [loadingDocumentIds, setLoadingDocumentIds] = useState<Set<string>>(new Set());

  const markAsViewed = async (document: Document) => {
    // If already viewed, no need to update
    if (document.viewed) return;
    
    try {
      setLoadingDocumentIds(prev => new Set([...prev, document.id]));
      
      const { error } = await supabase
        .from('documents')
        .update({ viewed: true })
        .eq('id', document.id);
        
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
        newSet.delete(document.id);
        return newSet;
      });
    }
  };

  const handleDownload = (document: Document) => {
    // Mark as viewed when downloaded
    markAsViewed(document);
  };

  return (
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
              <TableCell className="font-medium">
                <div className="flex items-center">
                  {!doc.viewed && (
                    <Bell size={14} className="text-red-500 mr-2" />
                  )}
                  {doc.name}
                </div>
              </TableCell>
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
                  disabled={isDocumentExpired(doc.expires_at) || loadingDocumentIds.has(doc.id)}
                  onClick={() => handleDownload(doc)}
                >
                  <a 
                    href={doc.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-1"
                    download={doc.filename || doc.original_filename || doc.name}
                  >
                    <Download size={14} />
                    <span>{doc.filename || doc.original_filename || "Baixar"}</span>
                  </a>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
