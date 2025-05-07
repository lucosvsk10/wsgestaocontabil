
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Document } from "@/utils/auth/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DocumentActions } from "./DocumentActions";
import { BellDot, Clock, Info, Tag } from "lucide-react";

interface DesktopDocumentTableProps {
  documents: Document[];
  category?: string;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expirationDate: string | null) => boolean;
  daysUntilExpiration: (expirationDate: string | null) => string | null;
  refreshDocuments: () => void;
  loadingDocumentIds: Set<string>;
  setLoadingDocumentIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleDownload: (doc: Document) => Promise<void>;
}

export const DesktopDocumentTable = ({
  documents,
  category,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments,
  loadingDocumentIds,
  handleDownload,
}: DesktopDocumentTableProps) => {
  return (
    <Table>
      <TableHeader className="bg-orange-200/60 dark:bg-navy-light/30">
        <TableRow>
          <TableHead className="text-navy dark:text-gold font-extralight">Nome do Documento</TableHead>
          <TableHead className="text-navy dark:text-gold font-extralight">Categoria</TableHead>
          <TableHead className="text-navy dark:text-gold font-extralight">Data de Envio</TableHead>
          <TableHead className="text-navy dark:text-gold font-extralight">Validade</TableHead>
          <TableHead className="text-navy dark:text-gold font-extralight">Observações</TableHead>
          <TableHead className="text-navy dark:text-gold font-extralight">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.length > 0 ? (
          documents.map(doc => (
            <TableRow 
              key={doc.id} 
              className={`${
                isDocumentExpired(doc.expires_at) 
                  ? "bg-red-100/20 dark:bg-red-900/20 border-red-200/30 dark:border-red-900/30"
                  : !doc.viewed
                    ? "bg-blue-100/20 dark:bg-blue-900/20 border-blue-200/50 dark:border-blue-700/50"
                    : "border-gold/10 hover:bg-orange-200/50 dark:hover:bg-navy-light/20"
              }`}
            >
              <TableCell className="font-medium text-navy dark:text-white">
                <div className="flex items-center">
                  {!doc.viewed && <BellDot size={16} className="text-blue-500 dark:text-blue-400 mr-2" />}
                  {doc.name}
                </div>
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-1">
                  <Tag size={14} />
                  {doc.category}
                </span>
              </TableCell>
              <TableCell className="text-gray-700 dark:text-gray-300">{formatDate(doc.uploaded_at)}</TableCell>
              <TableCell>
                <span className={`flex items-center gap-1 ${
                  isDocumentExpired(doc.expires_at) 
                    ? "text-red-600 dark:text-red-400" 
                    : "text-green-600 dark:text-green-400"
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
                        <div className="flex items-center text-blue-600 dark:text-blue-400 cursor-help">
                          <Info size={14} className="mr-1" />
                          <span className="truncate max-w-[150px]">{doc.observations}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-orange-100 dark:bg-navy-dark border-gold/20">
                        <p className="max-w-[300px] whitespace-normal break-words text-navy dark:text-white">
                          {doc.observations}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma</span>
                )}
              </TableCell>
              <TableCell>
                <DocumentActions 
                  doc={doc}
                  isDocumentExpired={isDocumentExpired}
                  refreshDocuments={refreshDocuments}
                  loadingDocumentIds={loadingDocumentIds}
                  handleDownload={handleDownload}
                />
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-4 text-gray-500 dark:text-gray-400">
              Não existem documentos {category ? `na categoria ${category}` : ''}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
