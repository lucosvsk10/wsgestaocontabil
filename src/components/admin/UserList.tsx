
import { useState } from "react";
import { User, Users, FileText, Lock, MoreHorizontal, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { UserType } from "@/types/admin";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [deleteUserDialog, setDeleteUserDialog] = useState(false);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<AuthUser | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Formatação da data
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Data desconhecida';
    const date = new Date(dateStr);
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: pt });
  };

  // Função para encontrar o role de um usuário
  const getUserRole = (authUserId: string) => {
    const userInfo = users.find(u => u.id === authUserId);
    return userInfo?.role || "cliente";
  };

  // Função para encontrar informações do usuário na tabela users
  const getUserInfo = (authUserId: string) => {
    return users.find(u => u.id === authUserId) || null;
  };

  const handleDeleteUser = async () => {
    if (!selectedUserForDelete) return;
    if (adminPassword !== "5BWasgc1@") {
      toast({
        variant: "destructive",
        title: "Senha incorreta",
        description: "A senha de administrador está incorreta"
      });
      return;
    }

    setIsDeleting(true);
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (!accessToken) {
        throw new Error("Você precisa estar logado para realizar esta ação");
      }
      
      const response = await fetch(`https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/admin-operations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          action: "deleteUser",
          userId: selectedUserForDelete.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao excluir usuário");
      }

      toast({
        title: "Usuário excluído com sucesso",
        description: `O usuário ${selectedUserForDelete.email} foi removido do sistema.`
      });

      setAdminPassword("");
      setDeleteUserDialog(false);
      setSelectedUserForDelete(null);
      refreshUsers();
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir usuário",
        description: error.message
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="px-0 bg-[#393532]">
        <CardHeader className="rounded-full bg-[#393532]">
          <CardTitle className="text-[#e8cc81] tracking-wider font-bold text-center">LISTA DE USUARIOS</CardTitle>
        </CardHeader>
        <CardContent className="rounded-full bg-[#393532]">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[#e9aa91] font-medium uppercase tracking-wider">NOME</TableHead>
                    <TableHead className="text-[#e9aa91] font-medium uppercase tracking-wider">Email</TableHead>
                    <TableHead className="text-[#e9aa91] font-medium uppercase tracking-wider">Função</TableHead>
                    <TableHead className="text-[#e9aa91] font-medium uppercase tracking-wider">Data de Cadastro</TableHead>
                    <TableHead className="text-[#e9aa91] font-medium uppercase tracking-wider">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-[#EAF6FF]">
                  {supabaseUsers.length > 0 ? (
                    supabaseUsers.map(authUser => {
                      const userInfo = getUserInfo(authUser.id);
                      return (
                        <TableRow key={authUser.id}>
                          <TableCell>{userInfo?.name || authUser.user_metadata?.name || "Sem nome"}</TableCell>
                          <TableCell>{authUser.email || "Sem email"}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${getUserRole(authUser.id) === 'admin' ? 'bg-purple-900 text-purple-100' : 'bg-blue-900 text-blue-100'}`}>
                              {getUserRole(authUser.id) || "cliente"}
                            </span>
                          </TableCell>
                          <TableCell>{authUser.created_at ? formatDate(authUser.created_at) : "Data desconhecida"}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex items-center gap-1" 
                                onClick={() => setSelectedUserId(authUser.id)}
                              >
                                <FileText size={14} />
                                <span>Documentos</span>
                              </Button>
                              {userInfo && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center gap-1"
                                  onClick={() => {
                                    setSelectedUserForPasswordChange(userInfo);
                                    passwordForm.reset();
                                  }}
                                >
                                  <Lock size={14} />
                                  <span>Senha</span>
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="icon">
                                    <MoreHorizontal size={16} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="text-red-500 cursor-pointer"
                                    onClick={() => {
                                      setSelectedUserForDelete(authUser);
                                      setDeleteUserDialog(true);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Excluir Usuário</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-[#7d796d] bg-[in] bg-inherit">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteUserDialog} onOpenChange={setDeleteUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão de usuário</DialogTitle>
            <DialogDescription>
              Você está prestes a excluir o usuário {selectedUserForDelete?.email}. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="adminPassword" className="block text-sm font-medium">
                Digite a senha de administrador para confirmar
              </label>
              <Input
                id="adminPassword"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="mt-1"
                placeholder="Senha de administrador"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteUser}
              disabled={isDeleting}
            >
              {isDeleting ? 
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Excluindo...
                </span> : 
                "Excluir Usuário"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
