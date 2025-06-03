import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Lock, Trash2, Mail, Calendar, Settings, Search, Plus, Users, UserCheck, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDate } from "./utils/dateUtils";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { UserCreationDialog } from "./components/UserCreationDialog";
import { useUserCreation } from "@/hooks/useUserCreation";
import { useToast } from "@/hooks/use-toast";
import { UserFormData } from "./CreateUser";
import { UserType } from "@/types/admin";

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  user_metadata?: {
    name?: string;
  };
}

interface UserListProps {
  supabaseUsers: AuthUser[];
  users: UserType[];
  isLoading: boolean;
  setSelectedUserId: (id: string) => void;
  setSelectedUserForPasswordChange: (user: UserType) => void;
  passwordForm: any;
  refreshUsers: () => void;
}

export const UserList = ({
  supabaseUsers,
  users,
  isLoading,
  setSelectedUserId,
  setSelectedUserForPasswordChange,
  passwordForm,
  refreshUsers
}: UserListProps) => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [isUserCreationDialogOpen, setIsUserCreationDialogOpen] = useState(false);
  const {
    isCreatingUser,
    createUser
  } = useUserCreation(refreshUsers);
  const isAdminUser = (authUserId: string, email: string | null) => {
    if (email === "wsgestao@gmail.com" || email === "l09022007@gmail.com") {
      return true;
    }
    const userInfo = users.find(u => u.id === authUserId);
    return ['fiscal', 'contabil', 'geral'].includes(userInfo?.role || '');
  };
  const getUserName = (authUser: any) => {
    const userInfo = users.find(u => u.id === authUser.id);
    return userInfo?.name || authUser.user_metadata?.name || "Sem nome";
  };
  const adminUsers = supabaseUsers.filter(authUser => {
    if (authUser.email === "julia@gmail.com") return true;
    return isAdminUser(authUser.id, authUser.email);
  });
  const clientUsers = supabaseUsers.filter(authUser => {
    if (authUser.email === "julia@gmail.com") return false;
    return !isAdminUser(authUser.id, authUser.email);
  });
  const filterAndSortUsers = (usersList: any[]) => {
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
  const handleUserCreation = async (data: UserFormData) => {
    try {
      await createUser(data);
      setIsUserCreationDialogOpen(false);
      toast({
        title: "Usuário criado com sucesso",
        description: "O novo usuário foi adicionado ao sistema."
      });
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        title: "Erro ao criar usuário",
        description: "Ocorreu um erro ao criar o usuário. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  const handleDeleteUser = (userId: string) => {
    if (confirm('Deseja realmente excluir este usuário?')) {
      refreshUsers();
      toast({
        title: "Usuário excluído",
        description: "O usuário foi removido do sistema."
      });
    }
  };
  if (isLoading) {
    return <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#020817] flex justify-center items-center">
        <LoadingSpinner />
      </div>;
  }
  const UserTable = ({
    usersList,
    title,
    isAdmin = false
  }: {
    usersList: any[];
    title: string;
    isAdmin?: boolean;
  }) => (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        {isAdmin ? <UserCheck className="h-6 w-6 text-[#020817] dark:text-[#efc349]" /> : <Users className="h-6 w-6 text-[#020817] dark:text-[#efc349]" />}
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
                        onClick={() => {
                          const userInfo = users.find(u => u.id === user.id);
                          if (userInfo) {
                            setSelectedUserForPasswordChange(userInfo);
                            passwordForm.reset();
                          }
                        }}
                      >
                        <Lock className="h-4 w-4 mr-1" />
                        Senha
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="bg-transparent border border-[#efc349] text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight"
                      >
                        <MoreHorizontal className="h-4 w-4 mr-1" />
                        ...
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="bg-transparent border border-red-400 text-red-600 dark:text-red-400 hover:bg-red-400/10 font-extralight" 
                        onClick={() => handleDeleteUser(user.id)}
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
                <TableCell colSpan={isAdmin ? 2 : 4} className="text-center py-8 text-gray-500 dark:text-[#b3b3b3] font-extralight">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#020817] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extralight text-[#020817] dark:text-[#efc349] mb-2">
              Gerenciamento de Usuários
            </h1>
            <p className="text-gray-600 dark:text-[#b3b3b3] font-extralight">
              Gerencie todos os usuários do sistema
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Buscar por nome ou email..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10 bg-white dark:bg-[#0b0f1c] border-gray-200 dark:border-[#efc349]/30 font-extralight" 
            />
          </div>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full md:w-48 bg-white dark:bg-[#0b0f1c] border-gray-200 dark:border-[#efc349]/30">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#0b0f1c] border-gray-200 dark:border-[#efc349]/30">
              <SelectItem value="newest" className="font-extralight">Mais recente</SelectItem>
              <SelectItem value="oldest" className="font-extralight">Mais antigo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* User Tables */}
        <UserTable usersList={clientUsers} title="Clientes" />
        <UserTable usersList={adminUsers} title="Administradores" isAdmin={true} />

        {/* User Creation Dialog */}
        <UserCreationDialog 
          isOpen={isUserCreationDialogOpen} 
          onClose={() => setIsUserCreationDialogOpen(false)} 
          onSubmit={handleUserCreation} 
          isCreating={isCreatingUser} 
        />
      </div>
    </div>
  );
};
