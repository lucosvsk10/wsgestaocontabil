
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "../common/LoadingSpinner";

interface ChangeRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authUser: {
    id: string;
    email: string;
  };
  onSuccess: () => void;
}

export const ChangeRoleDialog = ({
  open,
  onOpenChange,
  authUser,
  onSuccess,
}: ChangeRoleDialogProps) => {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleChange = async () => {
    if (!selectedRole) return;

    setIsSubmitting(true);
    try {
      // Update role in the roles table
      const { error } = await supabase
        .from('roles')
        .upsert({ 
          user_id: authUser.id, 
          role: selectedRole 
        }, { 
          onConflict: 'user_id' 
        });

      if (error) throw error;

      toast({
        title: "Função atualizada",
        description: `A função do usuário foi atualizada com sucesso.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao atualizar função:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar função",
        description: error.message || "Ocorreu um erro ao atualizar a função do usuário."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar Função do Usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Cliente</SelectItem>
                <SelectItem value="contabil">Contábil</SelectItem>
                <SelectItem value="fiscal">Fiscal</SelectItem>
                <SelectItem value="geral">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRoleChange}
              disabled={!selectedRole || isSubmitting}
            >
              {isSubmitting && <LoadingSpinner />}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
