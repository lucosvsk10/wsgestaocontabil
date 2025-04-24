
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authUser: {
    id: string;
    email: string;
  };
  onSuccess: () => void;
}

export const DeleteUserDialog = ({ open, onOpenChange, authUser, onSuccess }: DeleteUserDialogProps) => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteUser = async () => {
    setIsDeleting(true);
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (!accessToken) {
        throw new Error("Você precisa estar logado para realizar esta ação");
      }
      
      // First delete related records in the database
      const { error: documentsError } = await supabase
        .from('documents')
        .delete()
        .eq('user_id', authUser.id);
      
      if (documentsError) {
        console.error('Erro ao excluir documentos do usuário:', documentsError);
        throw new Error(`Erro ao excluir documentos: ${documentsError.message}`);
      }
      
      // Delete roles entry if it exists
      const { error: rolesError } = await supabase
        .from('roles')
        .delete()
        .eq('user_id', authUser.id);
      
      if (rolesError) {
        console.error('Erro ao excluir funções do usuário:', rolesError);
      }
      
      // Delete user profile if it exists
      const { error: usersError } = await supabase
        .from('users')
        .delete()
        .eq('id', authUser.id);
      
      if (usersError) {
        console.error('Erro ao excluir perfil do usuário:', usersError);
      }
      
      // Delete the auth user via edge function
      const response = await fetch(`https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/admin-operations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          operation: "delete_user",
          userId: authUser.id
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Erro ao excluir usuário");
      }

      const result = await response.json();
      
      toast({
        title: "Usuário excluído com sucesso",
        description: `O usuário ${authUser.email} foi removido do sistema.`
      });

      onOpenChange(false);
      onSuccess();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar exclusão de usuário</DialogTitle>
          <DialogDescription>
            Você está prestes a excluir o usuário {authUser.email}. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDeleteUser}
            disabled={isDeleting}
          >
            {isDeleting ? 
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Excluindo...
              </span> : 
              "Excluir Usuário"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
