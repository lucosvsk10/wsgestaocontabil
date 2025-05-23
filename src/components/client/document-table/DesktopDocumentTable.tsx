
import { Document } from "@/utils/auth/types";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { DocumentActions } from "./DocumentActions";
import { Badge } from "@/components/ui/badge";
import { Calendar, Eye, EyeOff } from "lucide-react";

interface DesktopDocumentTableProps {
  documents: Document[];
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  loadingDocumentIds?: Set<string>;
  handleDownload?: (doc: Document) => Promise<void>;
  refreshDocuments: () => void;
  categoryColor?: string; // Adicionar a tipagem para categoryColor
}

export const DesktopDocumentTable = ({
  documents,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  loadingDocumentIds = new Set(),
  handleDownload,
  refreshDocuments,
  categoryColor
}: DesktopDocumentTableProps) => {
  return (
    <div className="overflow-x-auto">
      <Table className="border-collapse w-full">
        <TableHeader className="dark:bg-deepNavy">
          <TableRow className={`border-b ${categoryColor ? `dark:border-[${categoryColor}]/30` : 'dark:border-gold/30'}`}>
            <TableHead className="dark:text-gold whitespace-nowrap w-8">#</TableHead>
            <TableHead className="dark:text-gold">Nome</TableHead>
            <TableHead className="dark:text-gold">Enviado em</TableHead>
            <TableHead className="dark:text-gold">Status</TableHead>
            <TableHead className="dark:text-gold">Validade</TableHead>
            <TableHead className="dark:text-gold text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc, index) => {
            const isExpired = isDocumentExpired(doc.expires_at || null);
            const expireDays = daysUntilExpiration(doc.expires_at || null);
            
            return (
              <TableRow 
                key={doc.id} 
                className={`dark:hover:bg-deepNavy/50 ${isExpired ? 'dark:bg-red-900/10' : 'dark:bg-transparent'} ${categoryColor ? `dark:border-[${categoryColor}]/10` : 'dark:border-gold/10'}`}
              >
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell className="flex items-center gap-2">
                  <span className="text-base font-medium dark:text-gray-200">
                    {doc.name}
                  </span>
                  {doc.viewed !== undefined && (
                    doc.viewed ? 
                      <Eye className="h-4 w-4 text-gray-400 dark:text-gray-500" /> : 
                      <Badge variant="secondary" className="dark:bg-gold dark:text-deepNavy text-xs">Novo</Badge>
                  )}
                </TableCell>
                <TableCell className="dark:text-gray-300 whitespace-nowrap">
                  {formatDate(doc.uploaded_at)}
                </TableCell>
                <TableCell>
                  {doc.viewed !== undefined && (
                    doc.viewed ? 
                      <Badge variant="outline" className="dark:border-gray-500 dark:text-gray-400">Visualizado</Badge> : 
                      <Badge variant="secondary" className="dark:bg-gold dark:text-deepNavy">Não visualizado</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {doc.expires_at ? (
                    <>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-400 dark:text-gray-400" />
                        <span className="text-sm dark:text-gray-300">{formatDate(doc.expires_at)}</span>
                      </div>
                      {expireDays && (
                        <Badge 
                          className={`mt-1 text-xs ${
                            isExpired 
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' 
                              : Number(expireDays) <= 30 
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                          }`}
                        >
                          {isExpired ? 'Expirado' : `Expira em ${expireDays} dias`}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">Sem validade</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DocumentActions 
                    document={doc} 
                    isLoading={loadingDocumentIds.has(doc.id)}
                    onDownload={handleDownload ? () => handleDownload(doc) : undefined}
                    refreshDocuments={refreshDocuments}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
