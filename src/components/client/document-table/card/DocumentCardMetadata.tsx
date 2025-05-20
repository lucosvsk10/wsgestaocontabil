
import { Clock, Info } from "lucide-react";
import { AppDocument } from "@/types/admin";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

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
    <div className="flex-1 mt-2 mb-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
      {/* Upload date */}
      <div>
        Enviado em: {formatDate(doc.uploaded_at)}
      </div>
      
      {/* Expiration date */}
      {doc.expires_at && (
        <div className="flex items-center">
          <span>Validade: </span>
          <span className={`ml-1 flex items-center ${
            isExpired
              ? "text-red-600 dark:text-red-400" 
              : "text-green-600 dark:text-green-400"
          }`}>
            <Clock size={14} className="inline mr-1" />
            {expirationText}
          </span>
        </div>
      )}
      
      {/* Observations */}
      {doc.observations && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center text-blue-600 dark:text-blue-400 cursor-help">
                <Info size={14} className="mr-1" />
                <span className="truncate">{doc.observations}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-orange-100 dark:bg-navy-dark border-gold/20 max-w-xs">
              <p className="whitespace-normal break-words text-navy dark:text-white">
                {doc.observations}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};
