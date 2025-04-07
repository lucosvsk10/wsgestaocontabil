
import { useState } from "react";
import { Download, Clock, Tag, Bell, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Document } from "@/utils/auth/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const { toast } = useToast();
  const [loadingDocumentIds, setLoadingDocumentIds] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();

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

  if (isMobile) {
    return (
      <div className="space-y-4">
        {documents.map(doc => (
          <div 
            key={doc.id} 
            className={`p-3 rounded-lg border ${isDocumentExpired(doc.expires_at) ? "bg-red-900/20 border-red-900/30" : "bg-[#46413d] border-gold/20"}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-white flex items-center">
                {!doc.viewed && <Bell size={14} className="text-red-500 mr-2" />}
                {doc.name}
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-[#393532] text-gold">
                {doc.category}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div className="text-gray-300">Data: <span className="text-white">{formatDate(doc.uploaded_at)}</span></div>
              <div className="text-gray-300">
                Validade: 
                <span className={isDocumentExpired(doc.expires_at) ? "text-red-400" : "text-green-400"}>
                  {" "}{daysUntilExpiration(doc.expires_at)}
                </span>
              </div>
            </div>
            
            {doc.observations && (
              <div className="mb-3 text-sm">
                <div className="text-blue-400 flex items-center">
                  <Info size={14} className="mr-1" />
                  <span className="text-gray-300">Observações:</span>
                </div>
                <p className="text-white text-sm ml-5">{doc.observations}</p>
              </div>
            )}
            
            <Button 
              variant="outline" 
              size="sm"
              disabled={isDocumentExpired(doc.expires_at) || loadingDocumentIds.has(doc.id)}
              onClick={() => handleDownload(doc)}
              className="w-full mt-2 bg-[#393532] border-gold/20 text-gold hover:bg-gold hover:text-navy flex items-center justify-center gap-1"
            >
              <Download size={14} />
              <span>Baixar</span>
            </Button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-[#393532]">
          <TableRow>
            <TableHead className="text-gold">Nome do Documento</TableHead>
            <TableHead className="text-gold">Categoria</TableHead>
            <TableHead className="text-gold">Data de Envio</TableHead>
            <TableHead className="text-gold">Validade</TableHead>
            <TableHead className="text-gold">Observações</TableHead>
            <TableHead className="text-gold">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map(doc => (
            <TableRow key={doc.id} className={isDocumentExpired(doc.expires_at) ? "bg-red-900/20 border-red-900/30" : "border-gold/10"}>
              <TableCell className="font-medium text-white">
                <div className="flex items-center">
                  {!doc.viewed && (
                    <Bell size={14} className="text-red-500 mr-2" />
                  )}
                  {doc.name}
                </div>
              </TableCell>
              <TableCell className="text-gray-300">
                <span className="flex items-center gap-1">
                  <Tag size={14} />
                  {doc.category}
                </span>
              </TableCell>
              <TableCell className="text-gray-300">{formatDate(doc.uploaded_at)}</TableCell>
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
                      <TooltipContent className="bg-[#393532] border-gold/20">
                        <p className="max-w-[300px] whitespace-normal break-words text-white">{doc.observations}</p>
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
                  className="flex items-center gap-1 bg-[#393532] border-gold/20 text-gold hover:bg-gold hover:text-navy"
                >
                  <Download size={14} />
                  <span>{doc.filename || doc.original_filename || "Baixar"}</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
