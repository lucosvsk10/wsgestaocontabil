
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface UserListHeaderProps {
  onCreateUser: () => void;
}

export const UserListHeader = ({ onCreateUser }: UserListHeaderProps) => {
  return (
    <header className="admin-page-header">
      <div>
        <p className="admin-eyebrow">Cadastros e acessos</p>
        <h1 className="admin-title">Empresas e usuários</h1>
        <p className="admin-subtitle">Gerencie o acesso das empresas, os responsáveis e a equipe interna do escritório.</p>
      </div>
      
      <Button
        onClick={onCreateUser}
        className="admin-button-primary h-9"
      >
        <Plus className="h-4 w-4 mr-2" />
        Novo usuário
      </Button>
    </header>
  );
};
