
import { FolderOpen } from "lucide-react";

export const EmptyCategory = () => {
  return (
    <div className="text-center py-[20px]">
      <FolderOpen className="h-16 w-16 mx-auto mb-4 text-gray-600" />
      <h3 className="text-lg font-medium mb-2 text-gold">Escolha uma categoria</h3>
      <p className="text-gray-400">
        Selecione uma categoria acima para visualizar seus documentos.
      </p>
    </div>
  );
};
