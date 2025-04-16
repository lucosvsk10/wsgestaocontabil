
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface EditNameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  setName: (name: string) => void;
  onSave: () => void;
  error: string | null;
}

export const EditNameDialog = ({ 
  isOpen, 
  onClose, 
  name, 
  setName, 
  onSave,
  error
}: EditNameDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-orange-200 dark:bg-navy-dark border border-gold/20">
        <DialogHeader>
          <DialogTitle className="text-navy dark:text-gold">Editar Nome do Usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            className="bg-orange-300/50 dark:bg-navy-light/50 border-gold/20 text-navy dark:text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do usuário"
            aria-label="Nome do usuário"
            aria-invalid={!!error}
            aria-describedby={error ? "name-error" : undefined}
          />
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm" id="name-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={onSave}
            disabled={!!error || name.trim().length < 3}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
