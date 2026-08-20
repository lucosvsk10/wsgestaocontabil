
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, Building2 } from "lucide-react";
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
    const filtered = usersList.filter(user => {
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
    <section className="admin-surface">
      <div className="admin-surface-header">
        <div><h2 className="admin-section-title">{title}</h2><p className="admin-section-description">{usersList.length} {usersList.length === 1 ? 'registro cadastrado' : 'registros cadastrados'}</p></div>
        <span className="admin-status admin-status-blue">{usersList.length} no total</span>
      </div>
      <div className="admin-table-wrap">
        <Table>
          <TableHeader>
            <TableRow className="h-11 border-b border-[var(--admin-line)] bg-[var(--admin-canvas)]/60 hover:bg-[var(--admin-canvas)]/60">
              {!isAdmin && (
                <TableHead className="px-4 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--admin-muted)]">Empresa / cliente</TableHead>
              )}
              <TableHead className="px-4 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--admin-muted)]">E-mail de acesso</TableHead>
              <TableHead className="px-4 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--admin-muted)]">Cadastro</TableHead>
              {!isAdmin && (
                <TableHead className="px-4 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--admin-muted)]">Ações</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filterAndSortUsers(usersList).map((user) => (
              <TableRow
                key={user.id}
                className="border-b border-[var(--admin-line)] transition-colors last:border-0 hover:bg-[var(--admin-blue-soft)]"
              >
                {!isAdmin && (
                  <TableCell className="px-4 py-3 text-xs font-semibold text-[var(--admin-ink)]">
                    {getUserName(user)}
                  </TableCell>
                )}
                <TableCell className="px-4 py-3 text-xs text-[var(--admin-muted)]">
                  {user.email || "Sem email"}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs text-[var(--admin-muted)]">
                  {formatDate(user.created_at)}
                </TableCell>
                {!isAdmin && (
                  <TableCell className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="admin-button-secondary h-8 px-2.5 text-[11px]"
                        onClick={() => navigate(`/admin/user-documents/${user.id}`)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Documentos
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="admin-button-secondary h-8 px-2.5 text-[11px]"
                        onClick={() => navigate(`/admin/company-data/${user.id}`)}
                      >
                        <Building2 className="h-4 w-4 mr-1" />
                        Dados da empresa
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-md border border-red-200 bg-transparent px-2.5 text-[11px] text-red-600 shadow-none hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
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
                  className="h-36 text-center text-xs text-[var(--admin-muted)]"
                >
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
};
