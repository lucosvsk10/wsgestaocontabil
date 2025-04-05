
import { useState } from "react";
import { User, Users, FileText, Lock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
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
}

export const UserList = ({ 
  supabaseUsers,
  users, 
  isLoading, 
  setSelectedUserId, 
  setSelectedUserForPasswordChange,
  passwordForm
}: UserListProps) => {
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

  return (
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
              <TableBody>
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
  );
};
