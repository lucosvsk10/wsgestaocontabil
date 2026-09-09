import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Lock, Trash2, Calendar, Settings, Search, Plus, Users, UserCheck, AtSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDate } from "./utils/dateUtils";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { UserCreationDialog } from "./components/UserCreationDialog";
import { useUserCreation } from "@/hooks/useUserCreation";
import { useToast } from "@/hooks/use-toast";
import { UserFormData } from "./CreateUser";

interface UserListDarkModeProps {
  supabaseUsers: any[];
  users: any[];
  isLoading: boolean;
  setSelectedUserId: (id: string) => void;
  setSelectedUserForPasswordChange: (user: any) => void;
  passwordForm: any;
  refreshUsers: () => void;
}

export const UserListDarkMode = ({
  supabaseUsers,
  users,
  isLoading,
  setSelectedUserForPasswordChange,
  passwordForm,
  refreshUsers
}: UserListDarkModeProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [isUserCreationDialogOpen, setIsUserCreationDialogOpen] = useState(false);
  const { isCreatingUser, createUser } = useUserCreation(refreshUsers);

  const getUserInfo = (authUser: any) => users.find(u => u.id === authUser.id);
  const getUserName = (authUser: any) => String(getUserInfo(authUser)?.name || authUser.user_metadata?.name || "SEM NOME").toUpperCase();
  const getUsername = (authUser: any) => String(getUserInfo(authUser)?.username || "USUÁRIO NÃO DEFINIDO").toUpperCase();

  const isAdminUser = (authUserId: string, email: string | null) => {
    if (email === "wsgestao@gmail.com" || email === "l09022007@gmail.com") return true;
    const userInfo = users.find(u => u.id === authUserId);
    return ['fiscal', 'contabil', 'geral'].includes(userInfo?.role || '');
  };

  const adminUsers = supabaseUsers.filter(authUser => {
    if (authUser.email === "julia@gmail.com") return true;
    return isAdminUser(authUser.id, authUser.email);
  });

  const clientUsers = supabaseUsers.filter(authUser => {
    if (authUser.email === "julia@gmail.com") return false;
    return !isAdminUser(authUser.id, authUser.email);
  });

  const filterAndSortUsers = (usersList: any[], isAdmin = false) => {
    const search = searchTerm.trim().toLowerCase();
    return usersList
      .filter(user => {
        const name = getUserName(user).toLowerCase();
        const credential = isAdmin ? (user.email?.toLowerCase() || "") : getUsername(user).toLowerCase();
        return name.includes(search) || credential.includes(search);
      })
      .sort((a, b) => {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
      });
  };

  const handleUserCreation = async (data: UserFormData) => {
    try {
      await createUser(data);
      setIsUserCreationDialogOpen(false);
      toast({ title: "Usuário criado com sucesso", description: "O novo usuário foi adicionado ao sistema." });
    } catch (error) {
      console.error("Error creating user:", error);
      toast({ title: "Erro ao criar usuário", description: "Ocorreu um erro ao criar o usuário. Tente novamente.", variant: "destructive" });
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Deseja realmente excluir este usuário?')) {
      refreshUsers();
      toast({ title: "Usuário excluído", description: "O usuário foi removido do sistema." });
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;

  const UserTable = ({ usersList, title, isAdmin = false }: { usersList: any[]; title: string; isAdmin?: boolean }) => {
    const visibleUsers = filterAndSortUsers(usersList, isAdmin);
    return <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        {isAdmin ? <UserCheck className="h-6 w-6 text-[#efc349]" /> : <Users className="h-6 w-6 text-[#efc349]" />}
        <h2 className="text-2xl uppercase tracking-wide text-gray-300 font-extralight">{title}</h2>
        <Badge variant="outline" className="border-[#efc349] text-[#efc349]">{usersList.length}</Badge>
      </div>

      <div className="bg-[#0b0f1c] rounded-lg border border-[#efc349]/30 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#efc349]/30 hover:bg-transparent">
              {!isAdmin && <TableHead className="text-[#efc349] font-semibold uppercase tracking-wider">Nome</TableHead>}
              <TableHead className="text-[#efc349] font-semibold uppercase tracking-wider"><div className="flex items-center gap-2"><AtSign className="h-4 w-4" />{isAdmin ? 'E-mail' : 'Usuário'}</div></TableHead>
              {!isAdmin && <TableHead className="text-[#efc349] font-semibold uppercase tracking-wider">Status da senha</TableHead>}
              <TableHead className="text-[#efc349] font-semibold uppercase tracking-wider"><div className="flex items-center gap-2"><Calendar className="h-4 w-4" />Data de Cadastro</div></TableHead>
              {!isAdmin && <TableHead className="text-[#efc349] font-semibold uppercase tracking-wider"><div className="flex items-center gap-2"><Settings className="h-4 w-4" />Ações</div></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleUsers.map((user, index) => {
              const info = getUserInfo(user);
              const standardPassword = Boolean(info?.must_change_password);
              return <TableRow key={user.id} className={`border-b border-[#efc349]/10 hover:bg-[#efc349]/5 transition-colors ${index % 2 === 1 ? 'bg-white/[0.015]' : ''}`}>
                {!isAdmin && <TableCell className="text-[#f4f4f4] font-extralight">{getUserName(user)}</TableCell>}
                <TableCell className="text-[#b3b3b3]">{isAdmin ? (user.email || "Sem e-mail") : getUsername(user)}</TableCell>
                {!isAdmin && <TableCell><Badge variant="outline" className={standardPassword ? "border-amber-400/30 bg-amber-500/10 text-amber-400" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-400"}>{standardPassword ? 'Senha padrão' : 'Senha alterada'}</Badge></TableCell>}
                <TableCell className="text-[#b3b3b3]">{formatDate(user.created_at)}</TableCell>
                {!isAdmin && <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-[#1e293b] hover:bg-[#efc349] hover:text-[#020817] text-white border-none transition-all" onClick={() => navigate(`/admin/user-documents/${user.id}`)}><FileText className="h-4 w-4 mr-1" />Documentos</Button>
                    <Button size="sm" variant="outline" className="bg-[#374151] hover:bg-[#4b5563] text-white border-[#374151]" onClick={() => { if (info) { setSelectedUserForPasswordChange(info); passwordForm.reset(); } }}><Lock className="h-4 w-4 mr-1" />Senha</Button>
                    <Button size="sm" className="bg-[#7f1d1d] hover:bg-[#dc2626] text-white border-none transition-all" onClick={() => handleDeleteUser(user.id)}><Trash2 className="h-4 w-4 mr-1" />Excluir</Button>
                  </div>
                </TableCell>}
              </TableRow>;
            })}
            {visibleUsers.length === 0 && <TableRow><TableCell colSpan={isAdmin ? 2 : 5} className="text-center py-8 text-[#b3b3b3]">Nenhum usuário encontrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>;
  };

  return <div className="space-y-8 p-6">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 className="text-3xl text-[#efc349] mb-2 font-extralight">Gerenciamento de Usuários</h1>
        <p className="text-[#b3b3b3]">Clientes são identificados pelo nome de usuário. O status mostra se a senha inicial já foi substituída.</p>
      </div>
      <Button onClick={() => setIsUserCreationDialogOpen(true)} className="bg-[#efc349] hover:bg-[#d4a73a] text-[#020817] font-semibold transition-all"><Plus className="h-4 w-4 mr-2" />Novo Usuário</Button>
    </div>

    <div className="flex flex-col md:flex-row gap-4 mb-8">
      <div className="relative flex-1"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#b3b3b3]" /><Input placeholder="Buscar por nome ou usuário..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 bg-[#0b0f1c] border-[#efc349]/30 text-[#f4f4f4] placeholder-[#b3b3b3] focus:border-[#efc349]" /></div>
      <Select value={sortOrder} onValueChange={setSortOrder}><SelectTrigger className="w-full md:w-48 bg-[#0b0f1c] border-[#efc349]/30 text-[#f4f4f4]"><SelectValue placeholder="Ordenar por" /></SelectTrigger><SelectContent className="bg-[#0b0f1c] border-[#efc349]/30"><SelectItem value="newest" className="text-[#f4f4f4] hover:bg-[#efc349]/10">Mais recente</SelectItem><SelectItem value="oldest" className="text-[#f4f4f4] hover:bg-[#efc349]/10">Mais antigo</SelectItem></SelectContent></Select>
    </div>

    <UserTable usersList={clientUsers} title="Clientes" />
    <UserTable usersList={adminUsers} title="Administradores" isAdmin={true} />
    <Button onClick={() => setIsUserCreationDialogOpen(true)} className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-[#efc349] hover:bg-[#d4a73a] text-[#020817] shadow-lg z-50" size="icon"><Plus className="h-6 w-6" /></Button>
    <UserCreationDialog isOpen={isUserCreationDialogOpen} onClose={() => setIsUserCreationDialogOpen(false)} onSubmit={handleUserCreation} isCreating={isCreatingUser} />
  </div>;
};
