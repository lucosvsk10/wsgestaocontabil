
import { BellDot, FileText } from "lucide-react";
import { AppDocument } from "@/types/admin";

interface DocumentCardHeaderProps {
  doc: AppDocument;
  isExpired: boolean;
}

export const DocumentCardHeader = ({ doc, isExpired }: DocumentCardHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-2">
      <div className="text-navy dark:text-gold">
        <FileText size={20} />
      </div>
      <div className="flex gap-1">
        {!doc.viewed && (
          <span className="text-xs px-2 py-1 rounded-full bg-blue-500 text-white flex items-center">
            <BellDot size={12} className="mr-1" />
            Novo
          </span>
        )}
        {isExpired && (
          <span className="text-xs px-2 py-1 rounded-full bg-red-500 text-white">
            Expirado
          </span>
        )}
        {doc.category && (
          <span className="text-xs px-2 py-1 rounded-full bg-orange-100 dark:bg-navy-light/50 text-navy dark:text-gold">
            {doc.category}
          </span>
        )}
      </div>
    </div>
  );
};
