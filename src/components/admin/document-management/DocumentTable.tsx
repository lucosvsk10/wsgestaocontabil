
import React from "react";
import { Download, Trash2, Eye, Clock, FileCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatBytes, formatDateTime } from "@/utils/formatters";
import { Document } from "@/types/admin";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface DocumentTableProps {
  documents: Document[];
  isLoading: boolean;
  loadingDocumentIds: Set<string>;
  onDownload: (document: Document) => void;
  onDelete: (documentId: string) => void;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  isLoading,
  loadingDocumentIds,
  onDownload,
  onDelete
}) => {
  // Helper function to check if a document is expired
  const isExpired = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false;
    const expirationDate = new Date(expiresAt);
    const now = new Date();
    return expirationDate < now;
  };
  
  // Helper function to get category badge color
  const getCategoryColor = (category: string): string => {
    const categoryColors: Record<string, string> = {
      "Imposto de Renda": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800",
      "Documentações": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      "Certidões": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      "Contratos": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
      "Notas Fiscais": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800",
      "Impostos": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
    };
    
    return categoryColors[category] || "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300 border-gray-200 dark:border-gray-700";
  };

  // Helper function to determine file type badge
  const getFileTypeBadge = (document: Document) => {
    const fileType = document.type || document.filename?.split('.').pop()?.toLowerCase();
    
    if (!fileType) return null;
    
    let text = fileType;
    let color = "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300 border-gray-200 dark:border-gray-700";
    
    if (fileType.includes('pdf')) {
      text = 'PDF';
      color = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800";
    } else if (fileType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType)) {
      text = 'Imagem';
      color = "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
    } else if (fileType.includes('word') || ['doc', 'docx'].includes(fileType)) {
      text = 'Word';
      color = "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    } else if (fileType.includes('excel') || ['xls', 'xlsx'].includes(fileType)) {
      text = 'Excel';
      color = "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800";
    }
    
    return <Badge variant="outline" className={`${color} text-xs font-medium`}>{text}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="border rounded-md p-8 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="border border-gray-200 dark:border-navy-light/30 rounded-md p-8">
        <div className="text-center">
          <FileCheck className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-200">Nenhum documento encontrado</h3>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Não há documentos disponíveis para este cliente ou com os filtros aplicados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-navy-light/30 rounded-md overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 dark:bg-navy-deeper">
            <TableHead className="font-medium">Nome do documento</TableHead>
            <TableHead className="font-medium">Nome original</TableHead>
            <TableHead className="font-medium">Categoria</TableHead>
            <TableHead className="font-medium">Data de envio</TableHead>
            <TableHead className="font-medium">Expiração</TableHead>
            <TableHead className="font-medium">Observações</TableHead>
            <TableHead className="font-medium">Status</TableHead>
            <TableHead className="text-right pr-4 font-medium">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => (
            <TableRow 
              key={document.id} 
              className={`border-b border-gray-200 dark:border-navy-light/10 hover:bg-gray-50 dark:hover:bg-navy-light/5 ${
                isExpired(document.expires_at) 
                  ? "bg-red-50/50 dark:bg-red-900/10"
                  : ""
              }`}
            >
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  {document.viewed ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Eye size={16} className="text-green-500 dark:text-green-400 shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Visualizado</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <div className="w-4"></div>
                  )}
                  {document.name || "Sem nome"}
                </div>
              </TableCell>
              <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                {document.original_filename || "N/A"}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={getCategoryColor(document.category)}>
                  {document.category}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Clock size={14} className="text-gray-500 dark:text-gray-400" />
                  {formatDateTime(document.uploaded_at)}
                </div>
              </TableCell>
              <TableCell>
                {document.expires_at ? (
                  isExpired(document.expires_at) ? (
                    <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <AlertTriangle size={14} />
                      <span>Expirado</span>
                    </div>
                  ) : (
                    <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800">
                      Válido até {formatDateTime(document.expires_at)}
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                    Não expira
                  </Badge>
                )}
              </TableCell>
              <TableCell className="max-w-[150px] truncate">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="cursor-help">
                      <span className="line-clamp-2 text-sm">{document.observations || "—"}</span>
                    </TooltipTrigger>
                    {document.observations && (
                      <TooltipContent className="max-w-sm">
                        <p>{document.observations}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
              <TableCell>
                {document.viewed ? (
                  <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800">
                    Visualizado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800">
                    Não visualizado
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDownload(document)}
                    disabled={loadingDocumentIds.has(document.id)}
                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                  >
                    {loadingDocumentIds.has(document.id) ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Download size={16} />
                    )}
                    <span className="sr-only">Download</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(document.id)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                  >
                    <Trash2 size={16} />
                    <span className="sr-only">Excluir</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
