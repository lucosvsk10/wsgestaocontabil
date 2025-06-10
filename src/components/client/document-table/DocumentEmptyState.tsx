
import React from "react";
import { File } from "lucide-react";

interface DocumentEmptyStateProps {
  searchQuery: string;
}

export const DocumentEmptyState = ({ searchQuery }: DocumentEmptyStateProps) => {
  return (
    <div className="text-center py-12 bg-white/50 dark:bg-navy-light/10 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gold/20 shadow-sm">
      <File className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum documento encontrado</h3>
      <p className="text-gray-600 dark:text-gray-400 font-extralight">
        {searchQuery 
          ? "Tente ajustar sua busca ou filtros" 
          : "Não há documentos disponíveis no momento"}
      </p>
    </div>
  );
};
