
import { User, FileText, Lock, Pencil } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { UserType } from "@/types/admin";
import { UserActions } from "./UserActions";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [editingUser, setEditingUser] = useState<{id: string, name: string} | null>(null);
  const [newName, setNewName] = useState("");
  
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

  // Função para iniciar a edição do nome do usuário
  const handleEditName = (authUser: AuthUser) => {
    const userInfo = getUserInfo(authUser.id);
    if (!userInfo) return;
    
    setEditingUser({
      id: authUser.id,
      name: userInfo.name || authUser.user_metadata?.name || ""
    });
    setNewName(userInfo.name || authUser.user_metadata?.name || "");
  };

  // Função para salvar o nome editado
  const handleSaveName = async () => {
    if (!editingUser) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ name: newName })
        .eq('id', editingUser.id);
        
      if (error) throw error;
      
      toast({
        title: "Nome atualizado",
        description: "O nome do usuário foi atualizado com sucesso.",
      });
      
      refreshUsers();
    } catch (error: any) {
      console.error("Erro ao atualizar nome:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar nome",
        description: error.message || "Ocorreu um erro ao atualizar o nome do usuário."
      });
    } finally {
      setEditingUser(null);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-3 text-navy dark:text-gold">{title}</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-gold/20">
              {!isAdminSection && (
                <TableHead className="text-navy dark:text-gold font-medium uppercase tracking-wider">NOME</TableHead>
              )}
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
                    {!isAdminSection && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{getUserName(authUser)}</span>
                          {userInfo && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 p-0 text-navy dark:text-gold hover:text-navy hover:bg-gold"
                              onClick={() => handleEditName(authUser)}
                              title="Editar nome"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
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
                <TableCell colSpan={isAdminSection ? 3 : 5} className="text-center py-4 text-navy/60 dark:text-white/60">
                  Nenhum {title.toLowerCase()} encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Diálogo para edição de nome */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="bg-orange-200 dark:bg-navy-dark border border-gold/20">
          <DialogHeader>
            <DialogTitle className="text-navy dark:text-gold">Editar Nome do Usuário</DialogTitle>
          </DialogHeader>
          <Input
            className="bg-orange-300/50 dark:bg-navy-light/50 border-gold/20 text-navy dark:text-white"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do usuário"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveName}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
