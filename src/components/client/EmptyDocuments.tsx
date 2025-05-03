
import { File } from "lucide-react";

export const EmptyDocuments = () => {
  return (
    <div className="text-center py-[40px]">
      <div className="bg-orange-300/10 dark:bg-navy-light/10 p-8 rounded-lg border border-gold/20">
        <File className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
        <h3 className="text-lg font-medium mb-2 text-navy dark:text-gold">Nenhum documento disponível</h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Não há documentos disponíveis para você no momento. 
          Quando documentos forem adicionados pela administração, eles aparecerão aqui.
        </p>
      </div>
    </div>
  );
};
