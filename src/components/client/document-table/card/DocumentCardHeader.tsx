
import { Document } from "@/utils/auth/types";
import { DocumentCardIcon } from "./DocumentCardIcon";
import { DocumentCardBadges } from "./DocumentCardBadges";

interface DocumentCardHeaderProps {
  doc: Document;
  isExpired: boolean;
}

export const DocumentCardHeader = ({ doc, isExpired }: DocumentCardHeaderProps) => {
  return (
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-center">
        <DocumentCardIcon document={doc} />
        <div className="ml-2">
          <DocumentCardBadges isViewed={!!doc.viewed} isExpired={isExpired} />
        </div>
      </div>
    </div>
  );
};
