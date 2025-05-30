
import { formatDate } from "../utils/dateUtils";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, Lock, Trash2, Edit, Building } from "lucide-react";
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
  onManageCompany?: () => void;
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
  onManageCompany,
  showDocumentButton = true
}: UserRowProps) => {
  const navigate = useNavigate();
  
  // Handle document button click
  const handleDocumentButtonClick = (userId: string) => {
    navigate(`/admin/user-documents/${userId}`);
  };

  return (
    <TableRow key={authUser.id} className="border-gold/20 hover:bg-orange-300/20 dark:hover:bg-navy-light/50">
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
      <TableCell className="text-gray-500 dark:text-white">{authUser.email || "Sem email"}</TableCell>
      <TableCell className="text-gray-500 dark:text-white">{formatDate(authUser.created_at)}</TableCell>
      {!isAdminSection && (
        <TableCell>
          <div className="flex flex-wrap space-x-2 gap-y-2">
            {showDocumentButton && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1 bg-white border-blue-300 text-navy-dark hover:bg-blue-50 dark:bg-navy-light/80 dark:text-white dark:hover:bg-gold dark:hover:text-navy" 
                onClick={() => handleDocumentButtonClick(authUser.id)}
                aria-label={`Ver documentos de ${authUser.user_metadata?.name || authUser.email || "usuário"}`}
              >
                <FileText size={14} />
                <span>Documentos</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 bg-white border-green-300 text-green-600 hover:bg-green-50 dark:bg-navy-light/80 dark:text-green-400 dark:hover:bg-green-600 dark:hover:text-white"
              onClick={onManageCompany}
              aria-label={`Gerenciar empresa de ${authUser.user_metadata?.name || authUser.email || "usuário"}`}
            >
              <Building size={14} />
              <span>Empresa</span>
            </Button>
            {userInfo && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 bg-white border-blue-300 text-navy-dark hover:bg-blue-50 dark:bg-navy-light/80 dark:text-white dark:hover:bg-gold dark:hover:text-navy"
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
              className="flex items-center gap-1 bg-white border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:bg-navy-light/80 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white"
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
