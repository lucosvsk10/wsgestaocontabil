
import React from "react";
import { File } from "lucide-react";

interface DocumentEmptyStateProps {
  searchQuery: string;
}

export const DocumentEmptyState = ({ searchQuery }: DocumentEmptyStateProps) => {
  return (
    <div className="text-center py-10 bg-gray-50 dark:bg-navy-light/10 rounded-lg border border-gray-200 dark:border-gold/20">
      <File className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nenhum documento encontrado</h3>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        {searchQuery 
          ? "Tente ajustar sua busca ou filtros" 
          : "Não há documentos disponíveis no momento"}
      </p>
    </div>
  );
};
