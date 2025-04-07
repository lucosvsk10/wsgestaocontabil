
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MakeAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authUser: {
    id: string;
    email: string;
  };
  onSuccess: () => void;
}

export const MakeAdminDialog = ({ open, onOpenChange, authUser, onSuccess }: MakeAdminDialogProps) => {
  const { toast } = useToast();
  const [isPromoting, setIsPromoting] = useState(false);

  const handleMakeAdmin = async () => {
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

      onOpenChange(false);
      onSuccess();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar promoção a administrador</DialogTitle>
          <DialogDescription>
            Você está prestes a promover o usuário {authUser.email} a administrador. 
            Isso concederá acesso administrativo completo ao sistema.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
  );
};
