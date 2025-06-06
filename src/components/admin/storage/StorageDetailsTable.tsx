
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserStorageData } from "@/hooks/useStorageStats";

interface StorageDetailsTableProps {
  storageData: UserStorageData[];
  formatSize: (size: number) => string;
}

export const StorageDetailsTable = ({ 
  storageData, 
  formatSize 
}: StorageDetailsTableProps) => {
  return (
    <div className="overflow-x-auto bg-white dark:bg-navy-deeper rounded-lg border border-gray-200 dark:border-navy-lighter/30">
      <h3 className="text-lg font-semibold text-navy dark:text-gold mb-4 p-4">
        Detalhes por Cliente
      </h3>
      <Table>
        <TableHeader>
          <TableRow className="border-gray-200 dark:border-navy-lighter/30">
            <TableHead className="text-navy dark:text-gold font-medium uppercase tracking-wider bg-gray-50 dark:bg-navy-medium">
              Nome
            </TableHead>
            <TableHead className="text-navy dark:text-gold font-medium uppercase tracking-wider bg-gray-50 dark:bg-navy-medium">
              Email
            </TableHead>
            <TableHead className="text-navy dark:text-gold font-medium uppercase tracking-wider text-right bg-gray-50 dark:bg-navy-medium">
              Espaço Utilizado
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-navy dark:text-white">
          {storageData.length > 0 ? (
            storageData.map((user: UserStorageData) => (
              <TableRow key={user.userId} className="border-gray-200 dark:border-navy-lighter/30 hover:bg-gray-100 dark:hover:bg-navy-medium">
                <TableCell>{user.name || 'Sem nome'}</TableCell>
                <TableCell>{user.email || 'Sem email'}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatSize(user.sizeBytes)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow className="border-gray-200 dark:border-navy-lighter/30">
              <TableCell colSpan={3} className="text-center py-4 text-navy/60 dark:text-white/60">
                Nenhum dado de armazenamento encontrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
