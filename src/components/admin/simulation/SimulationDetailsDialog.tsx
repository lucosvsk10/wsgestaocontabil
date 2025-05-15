
import { TaxSimulation } from "@/types/taxSimulation";
import { currencyFormat } from "@/utils/taxCalculations";
import { UserDetails } from "./types";
import { FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
  onGeneratePDF,
}: SimulationDetailsDialogProps) => {
  if (!simulation) return null;

  const userName = simulation.user_id && userDetails[simulation.user_id]?.name
    ? userDetails[simulation.user_id].name
    : simulation.nome || "Anônimo";

  const userEmail = simulation.user_id && userDetails[simulation.user_id]?.email
    ? userDetails[simulation.user_id].email
    : simulation.email || "N/A";

  const detailGroups = [
    {
      title: "Rendimentos",
      items: [
        {
          label: "Rendimento bruto anual",
          value: currencyFormat(simulation.rendimento_bruto),
        },
      ],
    },
    {
      title: "Deduções",
      items: [
        {
          label: "Contribuição INSS",
          value: currencyFormat(simulation.inss),
        },
        {
          label: "Despesas com educação",
          value: currencyFormat(simulation.educacao || 0),
        },
        {
          label: "Despesas médicas",
          value: currencyFormat(simulation.saude || 0),
        },
        {
          label: "Dependentes",
          value: `${simulation.dependentes || 0} (${currencyFormat((simulation.dependentes || 0) * 2275.08)})`,
        },
        {
          label: "Outras deduções",
          value: currencyFormat(simulation.outras_deducoes || 0),
        },
      ],
    },
    {
      title: "Resultado",
      items: [
        {
          label: "Tipo de declaração",
          value: simulation.tipo_simulacao,
          highlighted: true,
        },
        {
          label: "Imposto estimado",
          value: currencyFormat(simulation.imposto_estimado),
          highlighted: true,
        },
      ],
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-navy dark:text-gold text-xl">
            Detalhes da Simulação
          </DialogTitle>
          <DialogDescription className="dark:text-gray-300">
            Realizada em {new Date(simulation.data_criacao).toLocaleDateString("pt-BR")} às{" "}
            {new Date(simulation.data_criacao).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <h3 className="font-semibold dark:text-gold">Dados do contribuinte</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <p className="text-sm text-muted-foreground dark:text-gray-400">Nome</p>
                <p className="dark:text-white">{userName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground dark:text-gray-400">Email</p>
                <p className="dark:text-white">{userEmail}</p>
              </div>
              {simulation.telefone && (
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Telefone</p>
                  <p className="dark:text-white">{simulation.telefone}</p>
                </div>
              )}
            </div>
          </div>

          <Separator className="dark:bg-navy-lighter/50" />

          {detailGroups.map((group, idx) => (
            <div key={idx} className="space-y-2">
              <h3 className="font-semibold dark:text-gold">{group.title}</h3>
              <div className="space-y-1">
                {group.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="flex justify-between">
                    <p className="text-muted-foreground dark:text-gray-400">{item.label}</p>
                    <p className={item.highlighted ? "font-semibold dark:text-gold" : "dark:text-white"}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
              {idx < detailGroups.length - 1 && (
                <Separator className="dark:bg-navy-lighter/50" />
              )}
            </div>
          ))}

          {simulation.observacoes && (
            <>
              <Separator className="dark:bg-navy-lighter/50" />
              <div className="space-y-2">
                <h3 className="font-semibold dark:text-gold">Observações</h3>
                <p className="text-muted-foreground dark:text-gray-300 whitespace-pre-wrap">
                  {simulation.observacoes}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end mt-4">
          <Button
            onClick={() => onGeneratePDF(simulation)}
            className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-black"
          >
            <FileText className="h-4 w-4" />
            <span>Gerar PDF</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
