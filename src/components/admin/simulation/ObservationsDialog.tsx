
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { TaxSimulation } from "@/types/taxSimulation";

interface ObservationsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  simulation: TaxSimulation | null;
  observationText: string;
  onObservationTextChange: (text: string) => void;
  onSaveObservations: () => void;
}

export const ObservationsDialog = ({
  isOpen,
  onOpenChange,
  simulation,
  observationText,
  onObservationTextChange,
  onSaveObservations
}: ObservationsDialogProps) => {
  if (!simulation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-navy dark:text-gold">
            Adicionar Observações
          </DialogTitle>
          <DialogDescription className="dark:text-gray-300">
            Adicione notas ou observações internas sobre esta simulação.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <Textarea
            placeholder="Digite suas observações aqui..."
            className="min-h-[100px] dark:bg-navy-dark dark:border-navy-lighter/30"
            value={observationText}
            onChange={(e) => onObservationTextChange(e.target.value)}
          />
        </div>
        
        <DialogFooter className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={onSaveObservations}
            className="bg-gold hover:bg-gold/90 text-black"
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
