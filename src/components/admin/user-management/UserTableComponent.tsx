import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, FileText, Trash2, Mail, Calendar, Users, UserCheck, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDate } from "../utils/dateUtils";
import { UserType } from "@/types/admin";

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  user_metadata?: { name?: string };
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

export const UserTableComponent = ({ usersList, users, title, isAdmin = false, searchTerm, sortOrder, onDeleteUser }: UserTableComponentProps) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);

  const getUserName = (authUser: AuthUser) => users.find(user => user.id === authUser.id)?.name || authUser.user_metadata?.name || "Sem nome";

  const filteredUsers = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return [...usersList]
      .filter(user => getUserName(user).toLowerCase().includes(search) || (user.email || "").toLowerCase().includes(search))
      .sort((a, b) => sortOrder === "newest"
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [usersList, users, searchTerm, sortOrder]);

  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60">
            {isAdmin ? <UserCheck className="h-4 w-4" /> : <Users className="h-4 w-4" />}
          </div>
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">{isAdmin ? "Acessos administrativos" : "Credenciais usadas pelos clientes no portal"}</p>
          </div>
        </div>
        <Badge variant="secondary" className="rounded-full">{usersList.length}</Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {!isAdmin && <TableHead>Nome</TableHead>}
            <TableHead><span className="inline-flex items-center gap-2"><Mail className="h-3.5 w-3.5" />E-mail</span></TableHead>
            <TableHead><span className="inline-flex items-center gap-2"><Calendar className="h-3.5 w-3.5" />Criado em</span></TableHead>
            {!isAdmin && <TableHead className="w-12" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map((user, index) => {
            const isExpanded = expanded === user.id;
            return (
              <>
                <TableRow
                  key={user.id}
                  className={`cursor-pointer border-border/50 transition-colors hover:bg-muted/30 ${index % 2 ? "bg-muted/[0.12]" : "bg-transparent"}`}
                  onClick={() => !isAdmin && setExpanded(current => current === user.id ? null : user.id)}
                >
                  {!isAdmin && <TableCell className="font-medium">{getUserName(user)}</TableCell>}
                  <TableCell className="text-muted-foreground">{user.email || "Sem e-mail"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(user.created_at)}</TableCell>
                  {!isAdmin && <TableCell>{isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}</TableCell>}
                </TableRow>
                {!isAdmin && isExpanded && (
                  <TableRow key={`${user.id}-actions`} className="bg-muted/[0.18] hover:bg-muted/[0.18]">
                    <TableCell colSpan={4} className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); navigate(`/admin/user-documents/${user.id}`); }}>
                          <FileText className="mr-1.5 h-4 w-4" />Docs
                        </Button>
                        <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); navigate(`/admin/company-data/${user.id}`); }}>
                          <Building2 className="mr-1.5 h-4 w-4" />Dados da empresa
                        </Button>
                        <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={(event) => { event.stopPropagation(); onDeleteUser(user.id); }}>
                          <Trash2 className="mr-1.5 h-4 w-4" />Excluir acesso
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
          {filteredUsers.length === 0 && (
            <TableRow><TableCell colSpan={isAdmin ? 2 : 4} className="py-10 text-center text-muted-foreground">Nenhum acesso encontrado</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </section>
  );
};
