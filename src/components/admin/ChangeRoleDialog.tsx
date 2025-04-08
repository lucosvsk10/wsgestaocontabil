
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ChangeRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authUser: {
    id: string;
    email: string;
  };
  onSuccess?: () => void;
}

export const ChangeRoleDialog = ({
  open,
  onOpenChange,
  authUser,
  onSuccess,
}: ChangeRoleDialogProps) => {
  const { toast } = useToast();
  const [role, setRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const changeUserRole = async () => {
    if (!role) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione uma função para continuar",
      });
      return;
    }

    setIsLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (!accessToken) {
        throw new Error("Você precisa estar logado para alterar funções de usuários");
      }
      
      // Using direct URL to avoid issues with environment variables
      const response = await fetch(`https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/admin-operations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          operation: 'change_role',
          userId: authUser.id,
          role: role
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Erro ao alterar função do usuário");
      }
      
      toast({
        title: "Função alterada com sucesso",
        description: `A função do usuário foi alterada para ${getRoleDisplayName(role)}.`
      });
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao alterar função:', error);
      toast({
        variant: "destructive",
        title: "Erro ao alterar função",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleDisplayName = (roleValue: string) => {
    switch (roleValue) {
      case 'admin': return 'Admin';
      case 'fiscal': return 'Fiscal';
      case 'contabil': return 'Contábil';
      case 'geral': return 'Geral';
      default: return roleValue;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#393532] border border-gold/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-[#e8cc81]">Alterar Função do Usuário</DialogTitle>
          <DialogDescription className="text-[#e9aa91]">
            Altere a função do usuário: {authUser.email}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role" className="text-[#e9aa91]">Nova Função</Label>
            <Select onValueChange={setRole} value={role}>
              <SelectTrigger id="role" className="bg-[#46413d] border-gold/20 focus-visible:ring-gold text-white">
                <SelectValue placeholder="Selecione uma função" className="text-white" />
              </SelectTrigger>
              <SelectContent className="bg-[#46413d] border-gold/20 text-white">
                <SelectItem value="admin" className="text-white">Admin</SelectItem>
                <SelectItem value="fiscal" className="text-white">Fiscal</SelectItem>
                <SelectItem value="contabil" className="text-white">Contábil</SelectItem>
                <SelectItem value="geral" className="text-white">Geral</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gold/20 text-[#e9aa91] hover:bg-[#46413d]"
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={changeUserRole}
            className="bg-gold hover:bg-gold-light text-navy"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </span>
            ) : (
              "Alterar Função"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
