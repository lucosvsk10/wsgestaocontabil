
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
      
      // Delete all related records in the correct order to avoid foreign key errors
      
      // 1. Delete activity records (no dependencies)
      await supabase.from('announcement_views').delete().eq('user_id', authUser.id);
      await supabase.from('notifications').delete().eq('user_id', authUser.id);
      await supabase.from('visualized_documents').delete().eq('user_id', authUser.id);
      
      // 2. Delete poll/form responses
      await supabase.from('form_responses').delete().eq('user_id', authUser.id);
      await supabase.from('numerical_responses').delete().eq('user_id', authUser.id);
      await supabase.from('poll_responses').delete().eq('user_id', authUser.id);
      
      // 3. Delete simulations
      await supabase.from('tax_simulations').delete().eq('user_id', authUser.id);
      await supabase.from('inss_simulations').delete().eq('user_id', authUser.id);
      await supabase.from('prolabore_simulations').delete().eq('user_id', authUser.id);
      
      // 4. Delete document-related records
      await supabase.from('processed_documents').delete().eq('user_id', authUser.id);
      await supabase.from('uploads').delete().eq('user_id', authUser.id);
      await supabase.from('month_closures').delete().eq('user_id', authUser.id);
      
      // 5. Delete documents (critical - may have storage files)
      const { error: documentsError } = await supabase
        .from('documents')
        .delete()
        .eq('user_id', authUser.id);
      
      if (documentsError) {
        console.error('Erro ao excluir documentos:', documentsError);
        throw new Error(`Erro ao excluir documentos: ${documentsError.message}`);
      }
      
      // 6. Delete company data
      await supabase.from('company_data').delete().eq('user_id', authUser.id);
      
      // 7. Delete roles
      await supabase.from('roles').delete().eq('user_id', authUser.id);
      
      // 8. Delete user profile
      await supabase.from('users').delete().eq('id', authUser.id);
      
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
