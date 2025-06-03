
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/utils/documentUtils";

interface RecentDocumentsTableProps {
  documents: any[];
}

export const RecentDocumentsTable = ({ documents }: RecentDocumentsTableProps) => {
  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400 font-extralight">
        Nenhum documento encontrado
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-[#e6e6e6] dark:border-[#efc349]/20">
          <TableHead className="font-extralight text-[#020817] dark:text-white">Documento</TableHead>
          <TableHead className="font-extralight text-[#020817] dark:text-white">Usuário</TableHead>
          <TableHead className="font-extralight text-[#020817] dark:text-white">Data</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => (
          <TableRow key={doc.id} className="border-[#e6e6e6] dark:border-[#efc349]/20">
            <TableCell className="font-extralight text-[#020817] dark:text-white">
              {doc.name}
            </TableCell>
            <TableCell className="font-extralight text-[#020817] dark:text-white">
              {doc.users?.name || doc.users?.email || 'Usuário não encontrado'}
            </TableCell>
            <TableCell className="font-extralight text-[#020817] dark:text-white">
              {doc.uploaded_at ? formatDate(doc.uploaded_at) : 'Data não disponível'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
