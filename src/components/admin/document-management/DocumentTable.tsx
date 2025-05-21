
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
import { Document } from "@/types/admin";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ptBR } from "date-fns/locale";

interface DocumentTableProps {
  documents: Document[];
  isLoading: boolean;
  loadingDocumentIds: Set<string>;
  onDownload: (document: Document) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  isLoading,
  loadingDocumentIds,
  onDownload,
  onDelete
}) => {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return "Data inválida";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'imposto de renda':
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case 'documentações':
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case 'certidões':
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case 'contratos':
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      case 'notas fiscais':
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300";
      case 'impostos':
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <FileIcon className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
        <h3 className="font-medium text-lg text-gray-700 dark:text-gray-300">Nenhum documento encontrado</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mt-1">
          Este cliente não possui documentos cadastrados. Use a aba "Upload" para adicionar novos documentos.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-gray-50 dark:hover:bg-navy-deeper">
            <TableHead className="w-[300px]">Nome</TableHead>
            <TableHead>Arquivo Original</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Enviado em</TableHead>
            <TableHead>Expira em</TableHead>
            <TableHead>Observações</TableHead>
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
                  <div className="mr-2 text-slate-400">
                    <FileIcon className="h-5 w-5" />
                  </div>
                  <div className="max-w-[240px] overflow-hidden text-ellipsis">
                    {document.name}
                    {document.viewed ? (
                      <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                        <Eye className="w-3 h-3 mr-1" />
                        Visualizado
                      </span>
                    ) : null}
                  </div>
                </div>
              </TableCell>
              <TableCell className="max-w-[200px] overflow-hidden text-ellipsis">
                {document.original_filename || document.filename || "N/A"}
              </TableCell>
              <TableCell>
                {document.category ? (
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium ${getCategoryColor(document.category)}`}>
                    {document.category}
                  </span>
                ) : (
                  "N/A"
                )}
              </TableCell>
              <TableCell>{formatDate(document.uploaded_at)}</TableCell>
              <TableCell>
                {document.expires_at ? formatDate(document.expires_at) : "Sem expiração"}
              </TableCell>
              <TableCell className="max-w-[200px] overflow-hidden text-ellipsis">
                {document.observations || "N/A"}
              </TableCell>
              <TableCell className="text-right">
                {loadingDocumentIds.has(document.id) ? (
                  <div className="flex justify-end">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onDownload(document)}>
                        <Download className="mr-2 h-4 w-4" />
                        <span>Baixar</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete(document.id)}
                        className="text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Excluir</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
