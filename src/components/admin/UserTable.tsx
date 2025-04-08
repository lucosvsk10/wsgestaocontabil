
import { User, FileText, Lock } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { UserType } from "@/types/admin";
import { UserActions } from "./UserActions";

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  user_metadata?: {
    name?: string;
  };
}

interface UserTableProps {
  users: AuthUser[];
  userInfoList: UserType[];
  title: string;
  roleLabel: string;
  roleClassName: string;
  setSelectedUserId?: (id: string) => void;
  setSelectedUserForPasswordChange: (user: UserType) => void;
  passwordForm: any;
  refreshUsers: () => void;
  showDocumentButton?: boolean;
  specialEmail?: string;
  specialRoleLabel?: string;
  specialRoleClassName?: string;
  isAdminSection?: boolean;
}

export const UserTable = ({
  users,
  userInfoList,
  title,
  roleLabel,
  roleClassName,
  setSelectedUserId,
  setSelectedUserForPasswordChange,
  passwordForm,
  refreshUsers,
  showDocumentButton = false,
  specialEmail,
  specialRoleLabel,
  specialRoleClassName,
  isAdminSection = false
}: UserTableProps) => {
  // Formatação da data
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Data desconhecida';
    const date = new Date(dateStr);
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: pt });
  };

  // Função para encontrar informações do usuário na tabela users
  const getUserInfo = (authUserId: string) => {
    return userInfoList.find(u => u.id === authUserId) || null;
  };

  // Função para obter o nome do usuário, priorizando o nome da tabela users
  const getUserName = (authUser: AuthUser) => {
    const userInfo = getUserInfo(authUser.id);
    // Prioriza nome da tabela users, depois metadata e por fim 'Sem nome'
    return userInfo?.name || authUser.user_metadata?.name || "Sem nome";
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-3 text-[#e9aa91]">{title}</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-gold/20">
              <TableHead className="text-[#e9aa91] font-medium uppercase tracking-wider">NOME</TableHead>
              <TableHead className="text-[#e9aa91] font-medium uppercase tracking-wider">Email</TableHead>
              <TableHead className="text-[#e9aa91] font-medium uppercase tracking-wider">Função</TableHead>
              <TableHead className="text-[#e9aa91] font-medium uppercase tracking-wider">Data de Cadastro</TableHead>
              <TableHead className="text-[#e9aa91] font-medium uppercase tracking-wider">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-white">
            {users.length > 0 ? (
              users.map(authUser => {
                const userInfo = getUserInfo(authUser.id);
                const isSpecialUser = specialEmail && authUser.email === specialEmail;
                
                return (
                  <TableRow key={authUser.id} className="border-gold/20 hover:bg-[#46413d]">
                    <TableCell>{getUserName(authUser)}</TableCell>
                    <TableCell>{authUser.email || "Sem email"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${isSpecialUser ? specialRoleClassName : roleClassName}`}>
                        {isSpecialUser ? specialRoleLabel : roleLabel}
                      </span>
                    </TableCell>
                    <TableCell>{authUser.created_at ? formatDate(authUser.created_at) : "Data desconhecida"}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {showDocumentButton && setSelectedUserId && !isAdminSection && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-1 bg-[#46413d] text-white hover:bg-gold hover:text-navy border-gold/20" 
                            onClick={() => setSelectedUserId(authUser.id)}
                          >
                            <FileText size={14} />
                            <span>Documentos</span>
                          </Button>
                        )}
                        {userInfo && !isAdminSection && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1 bg-[#46413d] text-white hover:bg-gold hover:text-navy border-gold/20"
                            onClick={() => {
                              setSelectedUserForPasswordChange(userInfo);
                              passwordForm.reset();
                            }}
                          >
                            <Lock size={14} />
                            <span>Senha</span>
                          </Button>
                        )}
                        <UserActions 
                          authUser={authUser} 
                          refreshUsers={refreshUsers}
                          isAdminSection={isAdminSection} 
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow className="border-gold/20">
                <TableCell colSpan={5} className="text-center py-4 text-[#7d796d]">
                  Nenhum {title.toLowerCase()} encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
