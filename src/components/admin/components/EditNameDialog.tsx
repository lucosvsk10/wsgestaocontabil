
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface EditNameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  setName: (name: string) => void;
  onSave: () => void;
}

export const EditNameDialog = ({ 
  isOpen, 
  onClose, 
  name, 
  setName, 
  onSave 
}: EditNameDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-orange-200 dark:bg-navy-dark border border-gold/20">
        <DialogHeader>
          <DialogTitle className="text-navy dark:text-gold">Editar Nome do Usuário</DialogTitle>
        </DialogHeader>
        <Input
          className="bg-orange-300/50 dark:bg-navy-light/50 border-gold/20 text-navy dark:text-white"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do usuário"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSave}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
