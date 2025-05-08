
import React from "react";

interface DocumentResultsSummaryProps {
  count: number;
  searchQuery: string;
  statusFilter: string;
}

export const DocumentResultsSummary = ({
  count,
  searchQuery,
  statusFilter,
}: DocumentResultsSummaryProps) => {
  const getStatusText = (status: string) => {
    switch (status) {
      case "new": return "novos";
      case "viewed": return "visualizados";
      case "expired": return "expirados";
      case "active": return "ativos";
      default: return "";
    }
  };

  return (
    <div className="text-sm text-gray-600 dark:text-gray-300">
      Exibindo {count} {count === 1 ? 'documento' : 'documentos'}
      {searchQuery && ` para "${searchQuery}"`}
      {statusFilter !== "all" && (
        <span> com status {getStatusText(statusFilter)}</span>
      )}
    </div>
  );
};
