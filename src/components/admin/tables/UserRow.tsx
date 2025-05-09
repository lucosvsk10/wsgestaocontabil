
import { formatDate } from "../utils/dateUtils";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, Lock, Trash2, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { AuthUser } from "../types/userTable";
import { UserType } from "@/types/admin";

interface UserRowProps {
  authUser: AuthUser;
  userInfo: UserType | null;
  isAdminSection: boolean;
  displayName: string;
  onEditName: () => void;
  onChangePassword: () => void;
  onDelete: () => void;
  showDocumentButton?: boolean;
}

export const UserRow = ({
  authUser,
  userInfo,
  isAdminSection,
  displayName,
  onEditName,
  onChangePassword,
  onDelete,
  showDocumentButton = true
}: UserRowProps) => {
  const navigate = useNavigate();
  
  // Handle document button click
  const handleDocumentButtonClick = (userId: string) => {
    navigate(`/admin/user-documents/${userId}`);
  };

  return (
    <TableRow key={authUser.id} className="border-gold/20 hover:bg-orange-300/50 dark:hover:bg-navy-light/50">
      {!isAdminSection && (
        <TableCell>
          <div className="flex items-center gap-2">
            {displayName}
            {displayName === "Sem nome" && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 p-0" 
                onClick={onEditName}
                aria-label="Criar nome"
              >
                <Edit size={14} />
              </Button>
            )}
          </div>
        </TableCell>
      )}
      <TableCell>{authUser.email || "Sem email"}</TableCell>
      <TableCell>{formatDate(authUser.created_at)}</TableCell>
      {!isAdminSection && (
        <TableCell>
          <div className="flex flex-wrap space-x-2 gap-y-2">
            {showDocumentButton && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1 bg-orange-300/80 dark:bg-navy-light/80 text-navy dark:text-white hover:bg-gold hover:text-navy dark:hover:bg-gold dark:hover:text-navy border-gold/20" 
                onClick={() => handleDocumentButtonClick(authUser.id)}
                aria-label={`Ver documentos de ${authUser.user_metadata?.name || authUser.email || "usuário"}`}
              >
                <FileText size={14} />
                <span>Documentos</span>
              </Button>
            )}
            {userInfo && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 bg-orange-300/80 dark:bg-navy-light/80 text-navy dark:text-white hover:bg-gold hover:text-navy dark:hover:bg-gold dark:hover:text-navy border-gold/20"
                onClick={onChangePassword}
                aria-label={`Alterar senha de ${authUser.user_metadata?.name || authUser.email || "usuário"}`}
              >
                <Lock size={14} />
                <span>Senha</span>
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1 bg-orange-300/80 dark:bg-navy-light/80 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white border-gold/20"
              onClick={onDelete}
              aria-label={`Excluir ${authUser.user_metadata?.name || authUser.email || "usuário"}`}
            >
              <Trash2 size={14} />
              <span>Excluir</span>
            </Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
};
