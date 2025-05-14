
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { currencyFormat } from "@/utils/taxCalculations";
import { TaxSimulation } from "@/types/taxSimulation";

interface UserDetails {
  [key: string]: {
    name: string | null;
    email: string | null;
  };
}

interface SimulationDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  simulation: TaxSimulation | null;
  userDetails: UserDetails;
  onGeneratePDF: (simulation: TaxSimulation) => void;
}

export const SimulationDetailsDialog = ({
  isOpen,
  onOpenChange,
  simulation,
  userDetails,
  onGeneratePDF
}: SimulationDetailsDialogProps) => {
  if (!simulation) return null;

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd/MM/yyyy 'às' HH:mm", {
        locale: ptBR
      });
    } catch {
      return "Data inválida";
    }
  };

  const getUserName = (simulation: TaxSimulation) => {
    if (simulation.user_id && userDetails[simulation.user_id]?.name) {
      return userDetails[simulation.user_id].name;
    }
    return simulation.nome || "Anônimo";
  };

  const getUserEmail = (simulation: TaxSimulation) => {
    if (simulation.user_id && userDetails[simulation.user_id]?.email) {
      return userDetails[simulation.user_id].email;
    }
    return simulation.email || "N/A";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-navy dark:text-gold text-xl">
            Detalhes da Simulação
          </DialogTitle>
          <DialogDescription className="dark:text-gray-300">
            Simulação realizada em {formatDate(simulation.data_criacao || '')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 md:gap-8">
            <div className="flex-1 space-y-2">
              <h4 className="font-medium text-navy dark:text-gold">Dados do Contribuinte</h4>
              <div className="bg-gray-50 dark:bg-navy-dark rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-navy dark:text-gold" />
                  <div>
                    <p className="text-sm text-muted-foreground dark:text-gray-400">Nome:</p>
                    <p className="font-medium dark:text-white">{getUserName(simulation)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Email:</p>
                  <p className="dark:text-white">{getUserEmail(simulation)}</p>
                </div>
                {simulation.telefone && (
                  <div>
                    <p className="text-sm text-muted-foreground dark:text-gray-400">Telefone:</p>
                    <p className="dark:text-white">{simulation.telefone}</p>
                  </div>
                )}
                {simulation.user_id && (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                    Cliente registrado
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex-1 space-y-2">
              <h4 className="font-medium text-navy dark:text-gold">Resultado da Simulação</h4>
              <div className="bg-gray-50 dark:bg-navy-dark rounded-lg p-4 space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Tipo de declaração:</p>
                  <p className="font-medium dark:text-white">{simulation.tipo_simulacao}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Rendimento Bruto:</p>
                  <p className="font-medium dark:text-white">{currencyFormat(simulation.rendimento_bruto)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Imposto:</p>
                  <p className={`font-medium ${simulation.tipo_simulacao === 'a pagar' ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}>
                    {currencyFormat(simulation.imposto_estimado)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-2">
            <h4 className="font-medium text-navy dark:text-gold">Deduções Detalhadas</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-navy-dark rounded-lg p-4">
                <p className="text-sm text-muted-foreground dark:text-gray-400">INSS:</p>
                <p className="font-medium dark:text-white">{currencyFormat(simulation.inss)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-navy-dark rounded-lg p-4">
                <p className="text-sm text-muted-foreground dark:text-gray-400">Despesas com Saúde:</p>
                <p className="font-medium dark:text-white">{currencyFormat(simulation.saude || 0)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-navy-dark rounded-lg p-4">
                <p className="text-sm text-muted-foreground dark:text-gray-400">Despesas com Educação:</p>
                <p className="font-medium dark:text-white">{currencyFormat(simulation.educacao || 0)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-navy-dark rounded-lg p-4">
                <p className="text-sm text-muted-foreground dark:text-gray-400">Dependentes:</p>
                <p className="font-medium dark:text-white">{simulation.dependentes} ({currencyFormat((simulation.dependentes || 0) * 2275.08)})</p>
              </div>
              <div className="bg-gray-50 dark:bg-navy-dark rounded-lg p-4">
                <p className="text-sm text-muted-foreground dark:text-gray-400">Outras Deduções:</p>
                <p className="font-medium dark:text-white">{currencyFormat(simulation.outras_deducoes || 0)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-navy-dark rounded-lg p-4">
                <p className="text-sm text-muted-foreground dark:text-gray-400">Total de Deduções:</p>
                <p className="font-medium dark:text-white">
                  {currencyFormat(
                    simulation.inss + 
                    (simulation.saude || 0) + 
                    (simulation.educacao || 0) + 
                    ((simulation.dependentes || 0) * 2275.08) + 
                    (simulation.outras_deducoes || 0)
                  )}
                </p>
              </div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-2">
            <h4 className="font-medium text-navy dark:text-gold">Observações</h4>
            <div className="bg-gray-50 dark:bg-navy-dark rounded-lg p-4">
              {simulation.observacoes ? (
                <p className="dark:text-white">{simulation.observacoes}</p>
              ) : (
                <p className="text-muted-foreground dark:text-gray-400 italic">
                  Nenhuma observação adicionada.
                </p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
            <Button
              onClick={() => onGeneratePDF(simulation)}
              className="bg-gold hover:bg-gold/90 text-black"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
