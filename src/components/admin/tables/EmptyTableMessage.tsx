
import { TableCell, TableRow } from "@/components/ui/table";

interface EmptyTableMessageProps {
  message: string;
  colSpan: number;
}

export const EmptyTableMessage = ({ message, colSpan }: EmptyTableMessageProps) => {
  return (
    <TableRow className="border-gray-200 dark:border-gold/20">
      <TableCell colSpan={colSpan} className="text-center py-4 text-gray-500 dark:text-white/60">
        {message}
      </TableCell>
    </TableRow>
  );
};
