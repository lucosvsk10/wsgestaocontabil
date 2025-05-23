
import { useState } from "react";
import { Document } from "@/utils/auth/types";
import { DocumentCardHeader } from "./card/DocumentCardHeader";
import { DocumentCardMetadata } from "./card/DocumentCardMetadata";
import { DocumentCardActions } from "./card/DocumentCardActions";
import { DocumentCardBadges } from "./card/DocumentCardBadges";
import { DocumentCardIcon } from "./card/DocumentCardIcon";
import { Card } from "@/components/ui/card";

interface DocumentCardProps {
  document: Document;
  formatDate: (dateStr: string) => string;
  isExpired: boolean;
  daysUntilExpiration: string | null;
  isLoading?: boolean;
  onDownload?: () => Promise<void>;
  refreshDocuments: () => void;
  categoryColor?: string; // Adicionar a tipagem para categoryColor
}

export const DocumentCard = ({
  document,
  formatDate,
  isExpired,
  daysUntilExpiration,
  isLoading = false,
  onDownload,
  refreshDocuments,
  categoryColor
}: DocumentCardProps) => {
  const [expanded, setExpanded] = useState(false);
  
  const toggleExpand = () => setExpanded(!expanded);
  
  return (
    <Card 
      className={`rounded-xl overflow-hidden dark:border ${categoryColor ? `dark:border-[${categoryColor}]/30` : 'dark:border-gold/30'} hover:shadow-md transition-all dark:bg-deepNavy dark:hover:border-gold/40`}
    >
      <div className="flex p-4 gap-4">
        <DocumentCardIcon category={document.category} />
        
        <div className="flex-1 min-w-0 space-y-2">
          <DocumentCardHeader 
            name={document.name} 
            isViewed={document.viewed} 
            toggleExpand={toggleExpand}
            expanded={expanded}
          />
          
          <DocumentCardBadges
            isExpired={isExpired}
            daysUntilExpiration={daysUntilExpiration}
            isViewed={document.viewed}
          />
          
          {expanded && (
            <DocumentCardMetadata
              uploadDate={formatDate(document.uploaded_at)}
              expiryDate={document.expires_at ? formatDate(document.expires_at) : null}
              observations={document.observations}
              filename={document.original_filename || document.filename}
            />
          )}
          
          <DocumentCardActions
            document={document}
            isLoading={isLoading}
            onDownload={onDownload}
            refreshDocuments={refreshDocuments}
          />
        </div>
      </div>
    </Card>
  );
};
