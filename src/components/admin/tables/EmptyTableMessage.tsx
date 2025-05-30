
import { TableCell, TableRow } from "@/components/ui/table";

interface EmptyTableMessageProps {
  title: string;
  colSpan: number;
}

export const EmptyTableMessage = ({ title, colSpan }: EmptyTableMessageProps) => {
  const displayTitle = title || "item";
  
  return (
    <TableRow className="border-gray-200 dark:border-gold/20">
      <TableCell colSpan={colSpan} className="text-center py-4 text-gray-500 dark:text-white/60">
        Nenhum {displayTitle.toLowerCase()} encontrado
      </TableCell>
    </TableRow>
  );
};
