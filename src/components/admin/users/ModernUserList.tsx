
import { useState, useEffect } from "react";
import { Search, Plus, Mail, Calendar, Settings, Users, UserCheck, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserCreationDialog } from "../components/UserCreationDialog";
import { useUserCreation } from "@/hooks/useUserCreation";
import { useToast } from "@/hooks/use-toast";
import { UserFormData } from "../CreateUser";
import { formatDate } from "../utils/dateUtils";
import { useUserProfileData } from "@/hooks/upload/useUserProfileData";
import { EditNameDialog } from "../components/EditNameDialog";
import { UserType } from "@/types/admin";
import { useNavigate } from "react-router-dom";

interface ModernUserListProps {
  supabaseUsers: any[];
  users: UserType[];
  isLoading: boolean;
  setSelectedUserForPasswordChange: (user: UserType) => void;
  passwordForm: any;
  refreshUsers: () => void;
}

export const ModernUserList = ({
  supabaseUsers,
  users,
  isLoading,
  setSelectedUserForPasswordChange,
  passwordForm,
  refreshUsers
}: ModernUserListProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [isUserCreationDialogOpen, setIsUserCreationDialogOpen] = useState(false);
  const { isCreatingUser, createUser } = useUserCreation(refreshUsers);
  
  const {
    isEditingUser,
    newName,
    setNewName,
    nameError,
    getUserName,
    handleEditName,
    handleSaveName,
    cancelEditing
  } = useUserProfileData(refreshUsers);

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

  const UserTable = ({ usersList, title, isAdmin = false }: { usersList: any[]; title: string; isAdmin?: boolean }) => {
    const filteredUsers = filterAndSortUsers(usersList);
    
    return (
      <div className="space-y-6">
        {/* Section Header */}
        <div className="flex items-center gap-3">
          {isAdmin ? 
            <UserCheck className="h-6 w-6 text-[#020817] dark:text-[#efc349]" /> : 
            <Users className="h-6 w-6 text-[#020817] dark:text-[#efc349]" />
          }
          <h2 className="text-2xl font-extralight uppercase tracking-wide text-[#020817] dark:text-[#f4f4f4]">
            {title}
          </h2>
          <Badge 
            variant="outline" 
            className="border-[#efc349] text-[#efc349] bg-transparent"
          >
            {filteredUsers.length}
          </Badge>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200 dark:border-[#efc349]/30 hover:bg-transparent">
                  {!isAdmin && (
                    <TableHead className="text-[#020817] dark:text-[#efc349] font-extralight uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        NOME
                      </div>
                    </TableHead>
                  )}
                  <TableHead className="text-[#020817] dark:text-[#efc349] font-extralight uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      EMAIL
                    </div>
                  </TableHead>
                  <TableHead className="text-[#020817] dark:text-[#efc349] font-extralight uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      DATA DE CADASTRO
                    </div>
                  </TableHead>
                  {!isAdmin && (
                    <TableHead className="text-[#020817] dark:text-[#efc349] font-extralight uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        AÇÕES
                      </div>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user, index) => (
                  <TableRow 
                    key={user.id} 
                    className={`border-b border-gray-100 dark:border-[#efc349]/10 hover:bg-gray-50 dark:hover:bg-[#efc349]/5 transition-colors ${
                      index % 2 === 1 ? 'bg-gray-25 dark:bg-white/[0.015]' : ''
                    }`}
                  >
                    {!isAdmin && (
                      <TableCell className="text-[#020817] dark:text-[#f4f4f4] font-extralight">
                        {getUserName(user)}
                      </TableCell>
                    )}
                    <TableCell className="text-gray-500 dark:text-[#b3b3b3]">
                      {user.email || "Sem email"}
                    </TableCell>
                    <TableCell className="text-gray-500 dark:text-[#b3b3b3]">
                      {formatDate(user.created_at)}
                    </TableCell>
                    {!isAdmin && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="bg-transparent border border-[#efc349] text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight"
                            onClick={() => navigate(`/admin/user-documents/${user.id}`)}
                          >
                            Documentos
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-transparent border border-[#efc349]/50 text-[#020817] dark:text-[#b3b3b3] hover:bg-[#efc349]/10 font-extralight"
                            onClick={() => {
                              const userInfo = users.find(u => u.id === user.id);
                              if (userInfo) {
                                setSelectedUserForPasswordChange(userInfo);
                                passwordForm.reset();
                              }
                            }}
                          >
                            Senha
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-transparent border border-red-400 text-red-600 dark:text-red-400 hover:bg-red-500/10 font-extralight"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Excluir
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell 
                      colSpan={isAdmin ? 2 : 4} 
                      className="text-center py-8 text-gray-500 dark:text-[#b3b3b3]"
                    >
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30 rounded-2xl">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {!isAdmin && (
                    <div>
                      <p className="font-extralight text-[#020817] dark:text-[#f4f4f4] text-lg">
                        {getUserName(user)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500 dark:text-[#b3b3b3]">Email</p>
                    <p className="text-[#020817] dark:text-[#f4f4f4]">{user.email || "Sem email"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-[#b3b3b3]">Data de Cadastro</p>
                    <p className="text-[#020817] dark:text-[#f4f4f4]">{formatDate(user.created_at)}</p>
                  </div>
                  {!isAdmin && (
                    <div className="flex flex-col gap-2 pt-2">
                      <Button 
                        size="sm" 
                        className="bg-transparent border border-[#efc349] text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight w-full"
                        onClick={() => navigate(`/admin/user-documents/${user.id}`)}
                      >
                        Ver Documentos
                      </Button>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="bg-transparent border border-[#efc349]/50 text-[#020817] dark:text-[#b3b3b3] hover:bg-[#efc349]/10 font-extralight flex-1"
                          onClick={() => {
                            const userInfo = users.find(u => u.id === user.id);
                            if (userInfo) {
                              setSelectedUserForPasswordChange(userInfo);
                              passwordForm.reset();
                            }
                          }}
                        >
                          Alterar Senha
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-transparent border border-red-400 text-red-600 dark:text-red-400 hover:bg-red-500/10 font-extralight flex-1"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-[#b3b3b3]">
              Nenhum usuário encontrado
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extralight text-[#020817] dark:text-[#efc349] mb-2">
            Gerenciamento de Usuários
          </h1>
          <p className="text-gray-600 dark:text-[#b3b3b3]">
            Gerencie todos os usuários do sistema
          </p>
        </div>
        <Button 
          onClick={() => setIsUserCreationDialogOpen(true)} 
          className="bg-transparent border border-[#efc349] text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Search and Filter */}
      <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-[#b3b3b3]" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-transparent border-[#efc349]/30 text-[#020817] dark:text-[#f4f4f4] placeholder-gray-400 dark:placeholder-[#b3b3b3] focus:border-[#efc349]"
              />
            </div>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-full md:w-48 bg-transparent border-[#efc349]/30 text-[#020817] dark:text-[#f4f4f4]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#0b0f1c] border-[#efc349]/30">
                <SelectItem value="newest" className="text-[#020817] dark:text-[#f4f4f4] hover:bg-[#efc349]/10">
                  Mais recente
                </SelectItem>
                <SelectItem value="oldest" className="text-[#020817] dark:text-[#f4f4f4] hover:bg-[#efc349]/10">
                  Mais antigo
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* User Tables */}
      <UserTable usersList={clientUsers} title="Clientes" />
      <UserTable usersList={adminUsers} title="Administradores" isAdmin={true} />

      {/* Floating Action Button */}
      <Button 
        onClick={() => setIsUserCreationDialogOpen(true)} 
        className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-transparent border-2 border-[#efc349] text-[#efc349] hover:bg-[#efc349]/10 shadow-lg z-50" 
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Dialogs */}
      <UserCreationDialog
        isOpen={isUserCreationDialogOpen}
        onClose={() => setIsUserCreationDialogOpen(false)}
        onSubmit={handleUserCreation}
        isCreating={isCreatingUser}
      />

      <EditNameDialog 
        isOpen={!!isEditingUser} 
        onClose={cancelEditing} 
        name={newName} 
        setName={setNewName} 
        onSave={() => isEditingUser && handleSaveName(isEditingUser)} 
        error={nameError} 
      />
    </div>
  );
};
