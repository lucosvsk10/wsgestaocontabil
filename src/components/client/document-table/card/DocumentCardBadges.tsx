
import { Badge } from "@/components/ui/badge";

interface DocumentCardBadgesProps {
  isViewed: boolean;
  isExpired: boolean;
}

export const DocumentCardBadges = ({ isViewed, isExpired }: DocumentCardBadgesProps) => {
  return (
    <>
      {!isViewed ? (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-600 dark:text-white text-xs">
          Novo
        </Badge>
      ) : (
        <Badge variant="outline" className="text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 text-xs">
          Visualizado
        </Badge>
      )}
      
      {isExpired && (
        <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-700 dark:text-white">
          Expirado
        </Badge>
      )}
    </>
  );
};
