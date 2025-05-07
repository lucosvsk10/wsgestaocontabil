
import { FolderOpen } from "lucide-react";

export const EmptyCategory = () => {
  return (
    <div className="text-center py-[20px]">
      <FolderOpen className="h-16 w-16 mx-auto mb-4 text-gold/70 dark:text-gold/50" />
      <h3 className="text-lg font-medium mb-2 text-navy dark:text-gold">Escolha uma categoria</h3>
      <p className="text-gray-600 dark:text-gray-400">
        Selecione uma categoria acima para visualizar seus documentos.
      </p>
    </div>
  );
};
