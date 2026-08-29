import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface UserListHeaderProps {
  onCreateUser: () => void;
}

export const UserListHeader = ({ onCreateUser }: UserListHeaderProps) => {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Clientes do escritório</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Acessos do portal</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Gerencie somente as credenciais usadas pelos clientes para entrar no portal e acessar os documentos enviados pela WS Gestão.</p>
      </div>
      <Button onClick={onCreateUser}>
        <Plus className="mr-2 h-4 w-4" />
        Novo acesso
      </Button>
    </div>
  );
};
