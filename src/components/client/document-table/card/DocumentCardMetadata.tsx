
import { Clock, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Document } from "@/utils/auth/types";

interface DocumentCardMetadataProps {
  doc: Document;
  formatDate: (dateStr: string) => string;
  isExpired: boolean;
  expirationText: string | null;
}

export const DocumentCardMetadata = ({ doc, formatDate, isExpired, expirationText }: DocumentCardMetadataProps) => {
  return (
    <div className="mt-auto space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-gray-600 dark:text-gray-300">Data de Envio:</span>
        <span className="text-gray-800 dark:text-gray-100 font-medium">{formatDate(doc.uploaded_at)}</span>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-gray-600 dark:text-gray-300">Validade:</span>
        <span className={cn(
          "flex items-center",
          isExpired
            ? "text-red-600 dark:text-red-400" 
            : "text-green-600 dark:text-green-400"
        )}>
          <Clock size={14} className="mr-1" />
          <span>{expirationText || "Sem expiração"}</span>
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-gray-600 dark:text-gray-300">Status:</span>
        <div className="flex items-center">
          {doc.viewed ? (
            <span className="flex items-center text-green-600 dark:text-green-400">
              <Eye size={14} className="mr-1" />
              <span>Visualizado</span>
            </span>
          ) : (
            <span className="flex items-center text-blue-600 dark:text-blue-400">
              <EyeOff size={14} className="mr-1" />
              <span>Não visualizado</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
