
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface UserListHeaderProps {
  onCreateUser: () => void;
}

export const UserListHeader = ({ onCreateUser }: UserListHeaderProps) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extralight text-[#020817] dark:text-[#efc349] mb-2">
          Gerenciamento de Usuários
        </h1>
        <p className="text-gray-600 dark:text-[#b3b3b3] font-extralight">
          Gerencie todos os usuários do sistema
        </p>
      </div>
      
      <Button
        onClick={onCreateUser}
        className="bg-[#020817] hover:bg-[#0f172a] text-white dark:bg-transparent dark:border dark:border-[#efc349] dark:text-[#efc349] dark:hover:bg-[#efc349]/10 font-extralight"
      >
        <Plus className="h-4 w-4 mr-2" />
        Criar Novo Usuário
      </Button>
    </div>
  );
};
