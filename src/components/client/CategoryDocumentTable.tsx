
import { Download, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Document } from "@/types/admin";

interface CategoryDocumentTableProps {
  documents: Document[];
  category: string;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
}

export const CategoryDocumentTable = ({ 
  documents, 
  category,
  formatDate, 
  isDocumentExpired, 
  daysUntilExpiration 
}: CategoryDocumentTableProps) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome do Documento</TableHead>
            <TableHead>Data de Envio</TableHead>
            <TableHead>Validade</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length > 0 ? (
            documents.map(doc => (
              <TableRow key={doc.id} className={isDocumentExpired(doc.expires_at) ? "bg-red-900/20" : ""}>
                <TableCell className="font-medium">{doc.name}</TableCell>
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
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-4 text-gray-400">
                Não existem documentos na categoria {category}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
