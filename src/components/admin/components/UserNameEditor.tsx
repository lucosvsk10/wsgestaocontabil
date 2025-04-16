
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Pencil } from "lucide-react";

interface EditingUser {
  id: string;
  name: string;
}

export const UserNameEditor = ({ authUser, getUserName, refreshUsers }: { 
  authUser: { id: string; user_metadata?: { name?: string } };
  getUserName: (authUser: any) => string;
  refreshUsers: () => void;
}) => {
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  const [newName, setNewName] = useState("");

  const handleEditName = (authUser: any) => {
    setEditingUser({
      id: authUser.id,
      name: getUserName(authUser)
    });
    setNewName(getUserName(authUser));
  };

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
    <>
      <div className="flex items-center gap-2">
        <span>{getUserName(authUser)}</span>
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center gap-1 bg-orange-300/80 dark:bg-navy-light/80 text-navy dark:text-white hover:bg-gold hover:text-navy border-gold/20"
          onClick={() => handleEditName(authUser)}
        >
          <Pencil size={14} />
        </Button>
      </div>

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
    </>
  );
};
