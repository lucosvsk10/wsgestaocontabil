
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Document } from "@/utils/auth/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DocumentActions } from "./DocumentActions";
import { BellDot } from "lucide-react";

interface DesktopDocumentTableProps {
  documents: Document[];
  category: string;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expirationDate: string | null) => boolean;
  daysUntilExpiration: (expirationDate: string | null) => string | null;
  refreshDocuments: () => void;
  loadingDocumentIds: Set<string>;
  setLoadingDocumentIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export const DesktopDocumentTable = ({
  documents,
  category,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments,
  loadingDocumentIds,
}: DesktopDocumentTableProps) => {
  const getDisplayCategory = (doc: Document) => {
    if (doc.category === 'Impostos' && doc.subcategory === 'Imposto de Renda') {
      return 'Imposto de Renda';
    }
    return doc.category;
  };

  return (
    <Table>
      <TableHeader className="bg-[#393532]">
        <TableRow>
          <TableHead className="text-[#e8cc81] font-extralight bg-transparent">Nome do Documento</TableHead>
          <TableHead className="text-[#e8cc81] font-extralight bg-transparent">Categoria</TableHead>
          <TableHead className="text-[#e8cc81] font-extralight bg-transparent">Data de Envio</TableHead>
          <TableHead className="text-[#e8cc81] font-extralight bg-transparent">Validade</TableHead>
          <TableHead className="text-[#e8cc81] font-extralight bg-transparent">Observações</TableHead>
          <TableHead className="text-[#e8cc81] font-extralight bg-transparent">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.length > 0 ? (
          documents.map(doc => (
            <TableRow key={doc.id} className={isDocumentExpired(doc.expires_at) ? "bg-red-900/20 border-red-900/30" : "border-gold/10"}>
              <TableCell className="font-medium text-white">
                <div className="flex items-center">
                  {!doc.viewed && <BellDot size={16} className="text-blue-400 mr-2" />}
                  {doc.name}
                </div>
              </TableCell>
              <TableCell>
                <span className="px-2 py-1 rounded-full text-xs bg-gold text-navy">
                  {getDisplayCategory(doc)}
                </span>
              </TableCell>
              <TableCell className="text-gray-300">{formatDate(doc.uploaded_at)}</TableCell>
              <TableCell>
                <span className={`flex items-center gap-1 ${isDocumentExpired(doc.expires_at) ? "text-red-400" : "text-green-400"}`}>
                  {daysUntilExpiration(doc.expires_at)}
                </span>
              </TableCell>
              <TableCell>
                {doc.observations ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center text-blue-400 cursor-help">
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
                <div className="flex gap-2">
                  <DocumentActions 
                    doc={doc}
                    isDocumentExpired={isDocumentExpired}
                    refreshDocuments={refreshDocuments}
                    loadingDocumentIds={loadingDocumentIds}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-4 text-gray-400">
              Não existem documentos na categoria {category}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
