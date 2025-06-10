
import { FileText, Search } from "lucide-react";

interface DocumentEmptyStateProps {
  searchQuery: string;
}

export const DocumentEmptyState = ({ searchQuery }: DocumentEmptyStateProps) => {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 dark:bg-[#020817]/50 rounded-full flex items-center justify-center">
        {searchQuery ? (
          <Search className="w-10 h-10 text-gray-400 dark:text-gray-600" />
        ) : (
          <FileText className="w-10 h-10 text-gray-400 dark:text-gray-600" />
        )}
      </div>
      <h3 className="text-xl font-extralight text-[#020817] dark:text-white mb-3">
        {searchQuery ? "Nenhum documento encontrado" : "Nenhum documento disponível"}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 font-extralight max-w-md mx-auto">
        {searchQuery 
          ? "Tente ajustar os filtros de busca para encontrar o que procura"
          : "Quando houver documentos disponíveis, eles aparecerão aqui"
        }
      </p>
    </div>
  );
};
