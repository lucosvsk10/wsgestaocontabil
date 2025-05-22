import React, { useState, useCallback } from "react";
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
  ArrowDown,
  Search
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Document, DocumentCategory } from "@/types/admin";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Input } from "@/components/ui/input";

interface AdminDocumentTableProps {
  documents: Document[];
  isLoading: boolean;
  loadingDocumentIds: Set<string>;
  onDownload: (document: Document) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
  sortOrder: "asc" | "desc";
  onToggleSort: () => void;
  categories: DocumentCategory[];
}

export const AdminDocumentTable: React.FC<AdminDocumentTableProps> = ({
  documents,
  isLoading,
  loadingDocumentIds,
  onDownload,
  onDelete,
  sortOrder,
  onToggleSort,
  categories
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch (e) {
      return "Data inválida";
    }
  };

  const getCategoryColor = useCallback((categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || "#F5C441";
  }, [categories]);

  const getCategoryName = useCallback((categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || "Sem categoria";
  }, [categories]);

  // Filtra documentos com base na pesquisa e categoria selecionada
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = (
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.original_filename || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.observations || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.subcategory || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    const matchesCategory = !selectedCategory || doc.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

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

  // Componente de filtros
  const FiltersBar = () => (
    <div className="mb-6 flex flex-col md:flex-row gap-4">
      <div className="relative flex-grow">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por nome, observação, etc."
          className="pl-10 border-gray-300 dark:border-navy-lighter/40 bg-white dark:bg-navy-light/20"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <select
        className="rounded-md border border-gray-300 dark:border-navy-lighter/40 bg-white dark:bg-navy-light/20 dark:text-white px-3 py-2"
        value={selectedCategory || ""}
        onChange={(e) => setSelectedCategory(e.target.value || null)}
      >
        <option value="">Todas as categorias</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    </div>
  );

  // Renderização para desktop
  const renderDesktopView = () => (
    <div className="hidden md:block">
      <FiltersBar />
      
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
            {filteredDocuments.map(document => (
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
                  <div 
                    className="px-2.5 py-0.5 rounded-md text-xs font-medium inline-block"
                    style={{ 
                      backgroundColor: `${getCategoryColor(document.category)}20`,
                      color: getCategoryColor(document.category)
                    }}
                  >
                    {getCategoryName(document.category)}
                  </div>
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

  // Renderização para móvel
  const renderMobileView = () => (
    <div className="md:hidden">
      <FiltersBar />
      
      <div className="space-y-4">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Nenhum documento encontrado com os filtros atuais.
          </div>
        ) : (
          filteredDocuments.map(document => (
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
                {loadingDocumentIds.has(document.id) ? (
                  <LoadingSpinner size="sm" />
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
              </div>
              
              <div className="mt-3">
                <div 
                  className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium"
                  style={{ 
                    backgroundColor: `${getCategoryColor(document.category)}20`,
                    color: getCategoryColor(document.category)
                  }}
                >
                  {getCategoryName(document.category)}
                </div>
                
                {document.subcategory && (
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                    {document.subcategory}
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-y-2 mt-4 text-sm">
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
                      <>
                        <Eye className="inline h-3 w-3 mr-1 text-green-600 dark:text-green-400" />
                        Visualizado pelo cliente
                      </>
                    ) : (
                      "Não visualizado"
                    )}
                  </span>
                </div>
                
                {document.observations && (
                  <div className="col-span-2 mt-2">
                    <p className="text-gray-500 dark:text-gray-400">Observações:</p>
                    <p className="text-gray-900 dark:text-white mt-1">{document.observations}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="relative">
      {renderDesktopView()}
      {renderMobileView()}
      
      {filteredDocuments.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-right">
          Mostrando {filteredDocuments.length} de {documents.length} documento(s)
        </div>
      )}
    </div>
  );
};
