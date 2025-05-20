
import { Clock, Calendar } from "lucide-react";
import { AppDocument } from "@/types/admin";

interface DocumentCardMetadataProps {
  doc: AppDocument;
  formatDate: (dateStr: string) => string;
  isExpired: boolean;
  expirationText: string | null;
}

export const DocumentCardMetadata = ({ 
  doc, 
  formatDate, 
  isExpired, 
  expirationText 
}: DocumentCardMetadataProps) => {
  return (
    <div className="mt-2 flex-1 space-y-2 text-sm">
      <div className="flex items-center text-gray-600 dark:text-gray-400">
        <Calendar size={14} className="mr-1" />
        <span>Enviado em: {formatDate(doc.uploaded_at)}</span>
      </div>
      
      {doc.expires_at && (
        <div className={`flex items-center ${isExpired ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
          <Clock size={14} className="mr-1" />
          <span>Validade: {expirationText}</span>
        </div>
      )}
      
      {doc.observations && (
        <div className="text-gray-600 dark:text-gray-300 mt-2">
          <strong>Observações:</strong>
          <p className="text-navy dark:text-white">{doc.observations}</p>
        </div>
      )}
    </div>
  );
};
