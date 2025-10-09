
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Document } from "@/utils/auth/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DocumentActions } from "./DocumentActions";
import { BellDot, Clock, Info, AlertTriangle, ExternalLink } from "lucide-react";

interface DesktopDocumentTableProps {
  documents: Document[];
  category?: string;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expirationDate: string | null) => boolean;
  daysUntilExpiration: (expirationDate: string | null) => string | null;
  refreshDocuments: () => void;
  loadingDocumentIds: Set<string>;
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
      <TableHeader className="bg-orange-200/60 dark:bg-transparent dark:border-b dark:border-gold/30">
        <TableRow>
          <TableHead className="text-navy dark:text-gold font-extralight">Nome do Documento</TableHead>
          <TableHead className="text-navy dark:text-gold font-extralight">Validade</TableHead>
          <TableHead className="text-navy dark:text-gold font-extralight">Observações</TableHead>
          <TableHead className="text-navy dark:text-gold font-extralight">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.length > 0 ? (
          documents.map(doc => {
            const isExpired = isDocumentExpired(doc.expires_at);
            return (
              <TableRow 
                key={doc.id} 
                className={`transition-all duration-300 ${
                  isExpired 
                    ? "bg-red-100/20 dark:bg-transparent dark:border-red-500/30 border-red-200/30 opacity-60"
                    : !doc.viewed
                      ? "bg-blue-100/20 dark:bg-transparent dark:border-blue-500/30 border-blue-200/50"
                      : "border-gold/10 hover:bg-orange-200/50 dark:border-gold/20 dark:hover:bg-deepNavy/40"
                }`}
              >
                <TableCell className="font-medium text-navy dark:text-[#d9d9d9]">
                  <div className="flex items-center">
                    {!doc.viewed && !isExpired && <BellDot size={16} className="text-blue-500 dark:text-blue-400 mr-2" />}
                    {isExpired && <AlertTriangle size={16} className="text-red-500 dark:text-red-400 mr-2" />}
                    {doc.name}
                    {doc.drive_url && (
                      <span className="ml-2 text-xs px-2 py-1 rounded-full bg-blue-500/80 text-white dark:bg-transparent dark:border dark:border-blue-500/30 dark:text-blue-400 flex items-center gap-1">
                        <ExternalLink size={12} />
                        Drive
                      </span>
                    )}
                    {!doc.viewed && !isExpired && (
                      <span className="ml-2 text-xs px-2 py-1 rounded-full bg-blue-500/80 text-white dark:bg-transparent dark:border dark:border-blue-500/30 dark:text-blue-400">
                        Novo
                      </span>
                    )}
                    {isExpired && (
                      <span className="ml-2 text-xs px-2 py-1 rounded-full bg-red-500/80 text-white dark:bg-transparent dark:border dark:border-red-500/30 dark:text-red-400">
                        Expirado
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`flex items-center gap-1 ${
                    isExpired 
                      ? "text-red-600 dark:text-red-400" 
                      : "text-green-600 dark:text-green-400"
                  }`}>
                    <Clock size={14} />
                    {isExpired ? "Expirado" : daysUntilExpiration(doc.expires_at)}
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
                        <TooltipContent className="bg-orange-100 dark:bg-deepNavy dark:border-gold/30">
                          <p className="max-w-[300px] whitespace-normal break-words text-navy dark:text-[#d9d9d9]">
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
            );
          })
        ) : (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-4 text-gray-500 dark:text-gray-400">
              Não existem documentos {category ? `na categoria ${category}` : ''}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
