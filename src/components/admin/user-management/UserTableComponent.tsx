
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, Mail, Calendar, Settings, Users, UserCheck, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDate } from "../utils/dateUtils";
import { UserType } from "@/types/admin";

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  user_metadata?: {
    name?: string;
  };
}

interface UserTableComponentProps {
  usersList: AuthUser[];
  users: UserType[];
  title: string;
  isAdmin?: boolean;
  searchTerm: string;
  sortOrder: string;
  onDeleteUser: (userId: string) => void;
}

export const UserTableComponent = ({
  usersList,
  users,
  title,
  isAdmin = false,
  searchTerm,
  sortOrder,
  onDeleteUser
}: UserTableComponentProps) => {
  const navigate = useNavigate();

  const getUserName = (authUser: AuthUser) => {
    const userInfo = users.find(u => u.id === authUser.id);
    return userInfo?.name || authUser.user_metadata?.name || "Sem nome";
  };

  const filterAndSortUsers = (usersList: AuthUser[]) => {
    let filtered = usersList.filter(user => {
      const name = getUserName(user).toLowerCase();
      const email = user.email?.toLowerCase() || "";
      const search = searchTerm.toLowerCase();
      return name.includes(search) || email.includes(search);
    });

    return filtered.sort((a, b) => {
      if (sortOrder === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
    });
  };

  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        {isAdmin ? (
          <UserCheck className="h-6 w-6 text-[#020817] dark:text-[#efc349]" />
        ) : (
          <Users className="h-6 w-6 text-[#020817] dark:text-[#efc349]" />
        )}
        <h2 className="text-2xl font-extralight uppercase tracking-wide text-[#020817] dark:text-[#efc349]">
          {title}
        </h2>
        <Badge variant="outline" className="border-[#efc349] text-[#efc349]">
          {usersList.length}
        </Badge>
      </div>

      <div className="bg-white dark:bg-[#0b0f1c] rounded-xl shadow-sm border-none overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-100 dark:border-[#efc349]/20 hover:bg-transparent">
              {!isAdmin && (
                <TableHead className="text-[#020817] dark:text-[#efc349] font-extralight uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Nome
                  </div>
                </TableHead>
              )}
              <TableHead className="text-[#020817] dark:text-[#efc349] font-extralight uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </div>
              </TableHead>
              <TableHead className="text-[#020817] dark:text-[#efc349] font-extralight uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data de Cadastro
                </div>
              </TableHead>
              {!isAdmin && (
                <TableHead className="text-[#020817] dark:text-[#efc349] font-extralight uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Ações
                  </div>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filterAndSortUsers(usersList).map((user, index) => (
              <TableRow
                key={user.id}
                className={`border-b border-gray-100 dark:border-[#efc349]/10 hover:bg-gray-50 dark:hover:bg-[#efc349]/5 transition-colors ${
                  index % 2 === 1 ? 'bg-gray-50/50 dark:bg-white/[0.015]' : ''
                }`}
              >
                {!isAdmin && (
                  <TableCell className="text-[#020817] dark:text-[#f4f4f4] font-extralight">
                    {getUserName(user)}
                  </TableCell>
                )}
                <TableCell className="text-gray-600 dark:text-[#b3b3b3] font-extralight">
                  {user.email || "Sem email"}
                </TableCell>
                <TableCell className="text-gray-600 dark:text-[#b3b3b3] font-extralight">
                  {formatDate(user.created_at)}
                </TableCell>
                {!isAdmin && (
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-transparent border border-[#efc349] text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight"
                        onClick={() => navigate(`/admin/user-documents/${user.id}`)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Docs
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-transparent border border-[#efc349] text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight"
                        onClick={() => navigate(`/admin/company-data/${user.id}`)}
                      >
                        <Building2 className="h-4 w-4 mr-1" />
                        Empresa
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-transparent border border-red-400 text-red-600 dark:text-red-400 hover:bg-red-400/10 font-extralight"
                        onClick={() => onDeleteUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filterAndSortUsers(usersList).length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 2 : 4}
                  className="text-center py-8 text-gray-500 dark:text-[#b3b3b3] font-extralight"
                >
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
