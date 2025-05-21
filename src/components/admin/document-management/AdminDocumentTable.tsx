
import React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  MoreHorizontal, 
  Trash2, 
  Eye, 
  FileIcon,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Document } from "@/types/admin";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface AdminDocumentTableProps {
  documents: Document[];
  isLoading: boolean;
  loadingDocumentIds: Set<string>;
  onDownload: (document: Document) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
  sortOrder: "asc" | "desc";
  onToggleSort: () => void;
}

export const AdminDocumentTable: React.FC<AdminDocumentTableProps> = ({
  documents,
  isLoading,
  loadingDocumentIds,
  onDownload,
  onDelete,
  sortOrder,
  onToggleSort
}) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch (e) {
      return "Data inválida";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'contratos':
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case 'comprovantes':
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case 'impostos':
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
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

  // For mobile view, we'll render cards instead of a table
  const renderMobileView = () => {
    return (
      <div className="space-y-4 md:hidden">
        {documents.map(document => (
          <div 
            key={document.id}
            className="bg-white dark:bg-navy-light/10 rounded-lg border border-gray-200 dark:border-navy-lighter/30 p-4 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-start space-x-3">
                <FileIcon className="h-5 w-5 text-navy-dark dark:text-gold mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{document.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{document.original_filename}</p>
                </div>
              </div>
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
            </div>
            
            <div className="grid grid-cols-2 gap-y-2 mt-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Categoria:</span>
                <span 
                  className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(document.category)}`}
                >
                  {document.category}
                </span>
              </div>
              
              {document.subcategory && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Subcategoria:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{document.subcategory}</span>
                </div>
              )}
              
              <div>
                <span className="text-gray-500 dark:text-gray-400">Enviado:</span>
                <span className="ml-2 text-gray-900 dark:text-white">{formatDate(document.uploaded_at)}</span>
              </div>
              
              <div>
                <span className="text-gray-500 dark:text-gray-400">Expira:</span>
                <span className="ml-2 text-gray-900 dark:text-white">
                  {document.expires_at ? formatDate(document.expires_at) : "Sem expiração"}
                </span>
              </div>
              
              <div className="col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Status:</span>
                <span className="ml-2 inline-flex items-center">
                  {document.viewed ? (
                    <Eye className="inline h-3 w-3 mr-1 text-green-600 dark:text-green-400" />
                  ) : null}
                  {document.viewed ? "Visualizado pelo cliente" : "Não visualizado"}
                </span>
              </div>
              
              {document.observations && (
                <div className="col-span-2 mt-2">
                  <p className="text-gray-500 dark:text-gray-400">Observações:</p>
                  <p className="text-gray-900 dark:text-white mt-1">{document.observations}</p>
                </div>
              )}
            </div>
            
            {loadingDocumentIds.has(document.id) && (
              <div className="absolute inset-0 bg-gray-900/20 dark:bg-navy-dark/50 flex items-center justify-center rounded-lg">
                <LoadingSpinner />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Desktop table view
  const renderDesktopView = () => {
    return (
      <div className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-gray-50 dark:hover:bg-navy-deeper">
                <TableHead className="w-[250px]">Nome</TableHead>
                <TableHead>Arquivo Original</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Subcategoria</TableHead>
                <TableHead className="cursor-pointer whitespace-nowrap" onClick={onToggleSort}>
                  <div className="flex items-center">
                    Data de Envio
                    {sortOrder === "desc" ? 
                      <ArrowDown className="ml-1 h-4 w-4" /> : 
                      <ArrowUp className="ml-1 h-4 w-4" />
                    }
                  </div>
                </TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead>Visualizado</TableHead>
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
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap">
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
                  <TableCell>{document.subcategory || "N/A"}</TableCell>
                  <TableCell>{formatDate(document.uploaded_at)}</TableCell>
                  <TableCell>
                    {document.expires_at ? formatDate(document.expires_at) : "Sem expiração"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {document.viewed ? (
                        <>
                          <Eye className="h-4 w-4 text-green-600 dark:text-green-400 mr-1" />
                          <span className="text-green-600 dark:text-green-400">Sim</span>
                        </>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">Não</span>
                      )}
                    </div>
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
      </div>
    );
  };

  return (
    <div className="relative">
      {renderDesktopView()}
      {renderMobileView()}
    </div>
  );
};
