
import { User, FileText, Lock } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { UserType } from "@/types/admin";
import { UserActions } from "./UserActions";
import { Badge } from "@/components/ui/badge";

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

  // Função para obter o texto da função do usuário
  const getRoleText = (authUser: AuthUser) => {
    const userInfo = getUserInfo(authUser.id);
    if (!userInfo) return roleLabel;
    
    // Caso especial para email específico
    if (specialEmail && authUser.email === specialEmail) {
      return specialRoleLabel || "Geral";
    }
    
    // Retornar o papel baseado no valor da role no banco de dados
    switch (userInfo.role) {
      case 'fiscal': return "Fiscal";
      case 'contabil': return "Contábil";
      case 'geral': return "Geral";
      case 'client': return "Cliente";
      default: return roleLabel;
    }
  };
  
  // Função para obter a classe CSS da função do usuário
  const getRoleClassName = (authUser: AuthUser) => {
    const userInfo = getUserInfo(authUser.id);
    if (!userInfo) return roleClassName;
    
    // Caso especial para email específico
    if (specialEmail && authUser.email === specialEmail) {
      return specialRoleClassName || "bg-[#e8cc81] text-navy";
    }
    
    // Retornar a classe CSS baseada no valor da role no banco de dados
    switch (userInfo.role) {
      case 'fiscal': return "bg-green-800 text-green-100";
      case 'contabil': return "bg-indigo-800 text-indigo-100";
      case 'geral': return "bg-[#e8cc81] text-navy";
      case 'client': return "bg-blue-900 text-blue-100";
      default: return roleClassName;
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-3 text-navy dark:text-gold">{title}</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-gold/20">
              <TableHead className="text-navy dark:text-gold font-medium uppercase tracking-wider">NOME</TableHead>
              <TableHead className="text-navy dark:text-gold font-medium uppercase tracking-wider">Email</TableHead>
              <TableHead className="text-navy dark:text-gold font-medium uppercase tracking-wider">Função</TableHead>
              <TableHead className="text-navy dark:text-gold font-medium uppercase tracking-wider">Data de Cadastro</TableHead>
              {!isAdminSection && (
                <TableHead className="text-navy dark:text-gold font-medium uppercase tracking-wider">Ações</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="text-navy dark:text-white">
            {users.length > 0 ? (
              users.map(authUser => {
                const userInfo = getUserInfo(authUser.id);
                const isSpecialUser = specialEmail && authUser.email === specialEmail;
                
                return (
                  <TableRow key={authUser.id} className="border-gold/20 hover:bg-orange-300/50 dark:hover:bg-navy-light/50">
                    <TableCell>{getUserName(authUser)}</TableCell>
                    <TableCell>{authUser.email || "Sem email"}</TableCell>
                    <TableCell>
                      <Badge className={`${getRoleClassName(authUser)}`}>
                        {getRoleText(authUser)}
                      </Badge>
                    </TableCell>
                    <TableCell>{authUser.created_at ? formatDate(authUser.created_at) : "Data desconhecida"}</TableCell>
                    {!isAdminSection && (
                      <TableCell>
                        <div className="flex space-x-2">
                          {showDocumentButton && setSelectedUserId && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex items-center gap-1 bg-orange-300/80 dark:bg-navy-light/80 text-navy dark:text-white hover:bg-gold hover:text-navy border-gold/20" 
                              onClick={() => setSelectedUserId(authUser.id)}
                            >
                              <FileText size={14} />
                              <span>Documentos</span>
                            </Button>
                          )}
                          {userInfo && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1 bg-orange-300/80 dark:bg-navy-light/80 text-navy dark:text-white hover:bg-gold hover:text-navy border-gold/20"
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
                    )}
                  </TableRow>
                );
              })
            ) : (
              <TableRow className="border-gold/20">
                <TableCell colSpan={isAdminSection ? 4 : 5} className="text-center py-4 text-navy/60 dark:text-white/60">
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
