
import { useState } from "react";
import { Trash2, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserType } from "@/types/admin";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UserActionsProps {
  authUser: {
    id: string;
    email: string;
  };
  refreshUsers: () => void;
}

export const UserActions = ({ authUser, refreshUsers }: UserActionsProps) => {
  const { toast } = useToast();
  const [deleteUserDialog, setDeleteUserDialog] = useState(false);
  const [makeAdminDialog, setMakeAdminDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  const handleDeleteUser = async () => {
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
          userId: authUser.id
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Erro ao excluir usuário");
      }

      toast({
        title: "Usuário excluído com sucesso",
        description: `O usuário ${authUser.email} foi removido do sistema.`
      });

      setAdminPassword("");
      setDeleteUserDialog(false);
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

  const handleMakeAdmin = async () => {
    if (adminPassword !== "5BWasgc1@") {
      toast({
        variant: "destructive",
        title: "Senha incorreta",
        description: "A senha de administrador está incorreta"
      });
      return;
    }

    setIsPromoting(true);
    try {
      // Update the user's role in the users table
      const { error } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', authUser.id);
      
      if (error) throw error;
      
      toast({
        title: "Usuário promovido com sucesso",
        description: `O usuário ${authUser.email} agora tem privilégios de administrador.`
      });

      setAdminPassword("");
      setMakeAdminDialog(false);
      refreshUsers();
    } catch (error: any) {
      console.error('Erro ao promover usuário:', error);
      toast({
        variant: "destructive",
        title: "Erro ao promover usuário",
        description: error.message
      });
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <>
      <div className="flex flex-col w-full gap-2">
        <Button 
          variant="outline" 
          className="text-purple-500 cursor-pointer w-full justify-start"
          onClick={() => setMakeAdminDialog(true)}
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          <span>Tornar ADM</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="text-red-500 cursor-pointer w-full justify-start"
          onClick={() => setDeleteUserDialog(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Excluir Usuário</span>
        </Button>
      </div>

      {/* Make Admin Dialog */}
      <Dialog open={makeAdminDialog} onOpenChange={setMakeAdminDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar promoção a administrador</DialogTitle>
            <DialogDescription>
              Você está prestes a promover o usuário {authUser.email} a administrador. 
              Isso concederá acesso administrativo completo ao sistema.
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
            <Button variant="outline" onClick={() => setMakeAdminDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="default" 
              className="bg-purple-600 hover:bg-purple-700"
              onClick={handleMakeAdmin}
              disabled={isPromoting}
            >
              {isPromoting ? 
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando...
                </span> : 
                "Tornar Administrador"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteUserDialog} onOpenChange={setDeleteUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão de usuário</DialogTitle>
            <DialogDescription>
              Você está prestes a excluir o usuário {authUser.email}. Esta ação não pode ser desfeita.
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
