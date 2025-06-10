
import { FileText } from "lucide-react";

interface DocumentResultsSummaryProps {
  count: number;
  searchQuery: string;
  statusFilter: string;
}

export const DocumentResultsSummary = ({ 
  count, 
  searchQuery, 
  statusFilter 
}: DocumentResultsSummaryProps) => {
  const getFilterDescription = () => {
    if (searchQuery && statusFilter !== "all") {
      return `para "${searchQuery}" com status "${getStatusLabel(statusFilter)}"`;
    } else if (searchQuery) {
      return `para "${searchQuery}"`;
    } else if (statusFilter !== "all") {
      return `com status "${getStatusLabel(statusFilter)}"`;
    }
    return "";
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "new": return "Novos";
      case "viewed": return "Visualizados";
      case "expired": return "Expirados";
      case "active": return "Ativos";
      default: return "Todos";
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-[#efc349]/10 rounded-lg flex items-center justify-center">
          <FileText className="w-4 h-4 text-[#efc349]" />
        </div>
        <div>
          <p className="text-sm font-extralight text-[#020817] dark:text-white">
            <span className="font-normal">{count}</span> documento{count !== 1 ? 's' : ''} encontrado{count !== 1 ? 's' : ''}
            {getFilterDescription() && (
              <span className="text-gray-500 dark:text-gray-400"> {getFilterDescription()}</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
