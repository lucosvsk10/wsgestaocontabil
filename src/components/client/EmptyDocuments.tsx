
import { File } from "lucide-react";

export const EmptyDocuments = () => {
  return (
    <div className="text-center py-[20px]">
      <File className="h-16 w-16 mx-auto mb-4 text-gold/70 dark:text-gold/50" />
      <h3 className="text-lg font-medium mb-2 text-navy dark:text-gold">Nenhum documento disponível</h3>
      <p className="text-gray-600 dark:text-gray-400">
        Não há documentos disponíveis para você no momento. 
        Quando documentos forem adicionados, eles aparecerão aqui.
      </p>
    </div>
  );
};
