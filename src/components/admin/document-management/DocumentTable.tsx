
import React from "react";
import { 
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download, MoreHorizontal, Trash2, Eye, FileIcon } from "lucide-react";
import { format } from "date-fns";
import { AppDocument } from "@/types/admin";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface DocumentTableProps {
  documents: AppDocument[];
  isLoading: boolean;
  loadingDocumentIds: Set<string>;
  onDownload: (document: AppDocument) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  isLoading,
  loadingDocumentIds,
  onDownload,
  onDelete
}) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return "Data inválida";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'imposto de renda':
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300";
      case 'documentações':
        return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300";
      case 'certidões':
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300";
      case 'contratos':
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300";
      case 'notas fiscais':
        return "bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300";
      case 'impostos':
        return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <FileIcon className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
        <h3 className="font-medium text-lg text-gray-700 dark:text-gray-300">Nenhum documento encontrado</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mt-1">
          Este cliente não possui documentos cadastrados. Use a aba "Upload de Documentos" para adicionar novos documentos.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-gray-50 dark:hover:bg-navy-deeper">
            <TableHead className="w-[250px]">Nome</TableHead>
            <TableHead className="hidden md:table-cell">Arquivo Original</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="hidden md:table-cell">Enviado em</TableHead>
            <TableHead className="hidden lg:table-cell">Expira em</TableHead>
            <TableHead className="hidden xl:table-cell">Observações</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map(document => (
            <TableRow 
              key={document.id} 
              className="hover:bg-gray-50 dark:hover:bg-navy-deeper border-b border-gray-200 dark:border-navy-lighter/30"
            >
              <TableCell className="font-medium">
                <div className="flex items-center">
                  <div className="mr-2 text-slate-400 flex-shrink-0">
                    <FileIcon className="h-5 w-5" />
                  </div>
                  <div className="overflow-hidden text-ellipsis">
                    <span className="block truncate max-w-[200px]" title={document.name}>{document.name}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <span className="block truncate max-w-[150px]" title={document.original_filename || document.filename || "N/A"}>
                  {document.original_filename || document.filename || "N/A"}
                </span>
              </TableCell>
              <TableCell>
                {document.category ? (
                  <Badge className={`${getCategoryColor(document.category)} font-medium border-0`}>
                    {document.category}
                  </Badge>
                ) : (
                  "N/A"
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell whitespace-nowrap">{formatDate(document.uploaded_at)}</TableCell>
              <TableCell className="hidden lg:table-cell whitespace-nowrap">
                {document.expires_at ? formatDate(document.expires_at) : "Sem expiração"}
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <span className="block truncate max-w-[150px]" title={document.observations || "N/A"}>
                  {document.observations || "N/A"}
                </span>
              </TableCell>
              <TableCell className="text-center">
                {document.viewed ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-700/30 dark:text-green-400 flex items-center justify-center gap-1 whitespace-nowrap">
                    <Eye className="w-3 h-3" />
                    <span className="hidden sm:inline">Visualizado</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700/30 dark:text-blue-400 whitespace-nowrap">
                    Não visualizado
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {loadingDocumentIds.has(document.id) ? (
                  <div className="flex justify-end">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="hidden sm:flex items-center gap-1 h-8 border-gray-200 dark:border-navy-lighter/30 bg-white dark:bg-navy-light/20 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      onClick={() => onDownload(document)}
                    >
                      <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-blue-600 dark:text-blue-400">Baixar</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="hidden sm:flex items-center gap-1 h-8 border-gray-200 dark:border-navy-lighter/30 bg-white dark:bg-navy-light/20 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => onDelete(document.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-red-600 dark:text-red-400">Excluir</span>
                    </Button>
                    
                    {/* Mobile dropdown menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild className="sm:hidden">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white dark:bg-navy-deeper border-gray-200 dark:border-navy-lighter/30">
                        <DropdownMenuItem 
                          onClick={() => onDownload(document)}
                          className="cursor-pointer flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          <span>Baixar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete(document.id)}
                          className="cursor-pointer flex items-center text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Excluir</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
