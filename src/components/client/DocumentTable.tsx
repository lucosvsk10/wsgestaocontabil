
import { Download, Clock, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Document } from "@/types/admin";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface DocumentTableProps {
  documents: Document[];
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
}

export const DocumentTable = ({ 
  documents, 
  formatDate, 
  isDocumentExpired, 
  daysUntilExpiration 
}: DocumentTableProps) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome do Documento</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Data de Envio</TableHead>
            <TableHead>Validade</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map(doc => (
            <TableRow key={doc.id} className={isDocumentExpired(doc.expires_at) ? "bg-red-900/20" : ""}>
              <TableCell className="font-medium">{doc.name}</TableCell>
              <TableCell>
                <span className="flex items-center gap-1">
                  <Tag size={14} />
                  {doc.category}
                </span>
              </TableCell>
              <TableCell>{formatDate(doc.uploaded_at)}</TableCell>
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild
                  disabled={isDocumentExpired(doc.expires_at)}
                >
                  <a 
                    href={doc.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-1"
                  >
                    <Download size={14} />
                    <span>Baixar</span>
                  </a>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
