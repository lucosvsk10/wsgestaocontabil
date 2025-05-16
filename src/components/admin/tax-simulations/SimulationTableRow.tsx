
import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TaxSimulation } from "@/types/tax-simulations";
import { currencyFormat } from "@/utils/taxCalculations";

interface SimulationTableRowProps {
  simulation: TaxSimulation;
  getUserName: (simulation: TaxSimulation) => string | null;
  getUserEmail: (simulation: TaxSimulation) => string | null;
}

const SimulationTableRow = ({ simulation, getUserName, getUserEmail }: SimulationTableRowProps) => {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", {
        locale: ptBR
      });
    } catch {
      return "Data inválida";
    }
  };

  const totalDeducoes = simulation.inss + simulation.educacao + simulation.saude + simulation.dependentes * 2275.08 + simulation.outras_deducoes;

  return (
    <TableRow className="hover:bg-gray-50 dark:hover:bg-navy-dark">
      <TableCell className="dark:text-gray-300">
        {formatDate(simulation.data_criacao)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-dark flex items-center justify-center border border-gray-200 dark:border-navy-lighter/30">
            <User className="h-4 w-4 text-navy dark:text-gold" />
          </div>
          <div className="font-medium dark:text-white">
            {getUserName(simulation)}
            {simulation.user_id && <span className="ml-1 text-xs px-1 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">
                Cliente
              </span>}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm dark:text-gray-300">
          <p>{getUserEmail(simulation)}</p>
          {simulation.telefone && <p>{simulation.telefone}</p>}
        </div>
      </TableCell>
      <TableCell className="dark:text-gray-300">
        {currencyFormat(simulation.rendimento_bruto)}
      </TableCell>
      <TableCell>
        <div className="text-sm dark:text-gray-300">
          <p>Total: {currencyFormat(totalDeducoes)}</p>
          <p className="text-xs text-muted-foreground dark:text-gray-400">
            INSS: {currencyFormat(simulation.inss)}, 
            Saúde: {currencyFormat(simulation.saude)}, 
            Educação: {currencyFormat(simulation.educacao)}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <div className={`font-medium ${simulation.tipo_simulacao === 'a pagar' ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}>
          {currencyFormat(simulation.imposto_estimado)} ({simulation.tipo_simulacao})
        </div>
      </TableCell>
    </TableRow>
  );
};

export default SimulationTableRow;
