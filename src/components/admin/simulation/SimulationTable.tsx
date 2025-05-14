
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, 
  User, 
  ArrowDownUp 
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow, 
  TableFooter 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { currencyFormat } from "@/utils/taxCalculations";
import { TaxSimulation } from "@/types/taxSimulation";

interface UserDetails {
  [key: string]: {
    name: string | null;
    email: string | null;
  };
}

interface SimulationTableProps {
  filteredSimulations: TaxSimulation[];
  userDetails: UserDetails;
  sortConfig: {key: string, direction: string};
  onRequestSort: (key: string) => void;
  onViewDetails: (simulation: TaxSimulation) => void;
  onGeneratePDF: (simulation: TaxSimulation) => void;
  onOpenObservations: (simulation: TaxSimulation) => void;
}

export const SimulationTable = ({
  filteredSimulations,
  userDetails,
  sortConfig,
  onRequestSort,
  onViewDetails,
  onGeneratePDF,
  onOpenObservations
}: SimulationTableProps) => {
  
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

  const getSortDirection = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-navy-lighter/30 shadow-md">
      <Table>
        <TableHeader className="bg-gray-50 dark:bg-navy-dark">
          <TableRow className="hover:bg-gray-100 dark:hover:bg-navy-medium/50">
            <TableHead 
              className="dark:text-gray-300 cursor-pointer"
              onClick={() => onRequestSort('data_criacao')}
            >
              Data {getSortDirection('data_criacao')}
            </TableHead>
            <TableHead 
              className="dark:text-gray-300 cursor-pointer"
              onClick={() => onRequestSort('nome')}
            >
              Nome {getSortDirection('nome')}
            </TableHead>
            <TableHead 
              className="dark:text-gray-300 cursor-pointer"
              onClick={() => onRequestSort('rendimento_bruto')}
            >
              Rendimento {getSortDirection('rendimento_bruto')}
            </TableHead>
            <TableHead className="dark:text-gray-300">Deduções</TableHead>
            <TableHead 
              className="dark:text-gray-300 cursor-pointer"
              onClick={() => onRequestSort('imposto_estimado')}
            >
              Resultado {getSortDirection('imposto_estimado')}
            </TableHead>
            <TableHead className="dark:text-gray-300">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="dark:bg-navy-medium">
          {filteredSimulations.map(simulation => {
            const totalDeducoes = simulation.inss + 
                                (simulation.educacao || 0) + 
                                (simulation.saude || 0) + 
                                ((simulation.dependentes || 0) * 2275.08) + 
                                (simulation.outras_deducoes || 0);
            return (
              <TableRow key={simulation.id} className="hover:bg-gray-50 dark:hover:bg-navy-dark">
                <TableCell className="dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-navy dark:text-gray-400" />
                    {formatDate(simulation.data_criacao || '')}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-navy-dark flex items-center justify-center border border-gray-200 dark:border-navy-lighter/30">
                      <User className="h-4 w-4 text-navy dark:text-gold" />
                    </div>
                    <div>
                      <div className="font-medium dark:text-white">
                        {getUserName(simulation)}
                        {simulation.user_id && <Badge className="ml-1 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 text-xs hover:bg-blue-100">
                            Cliente
                          </Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground dark:text-gray-400">
                        {getUserEmail(simulation)}
                      </div>
                    </div>
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
                      Saúde: {currencyFormat(simulation.saude || 0)}, 
                      Educação: {currencyFormat(simulation.educacao || 0)}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className={`font-medium ${simulation.tipo_simulacao === 'a pagar' ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}>
                    {currencyFormat(simulation.imposto_estimado)}
                    <Badge className={`ml-1 text-xs ${
                      simulation.tipo_simulacao === 'a pagar' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 hover:bg-red-100' 
                        : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 hover:bg-green-100'
                    }`}>
                      {simulation.tipo_simulacao}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <ArrowDownUp className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onViewDetails(simulation)}>
                        Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onGeneratePDF(simulation)}>
                        Exportar PDF
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onOpenObservations(simulation)}>
                        Adicionar observações
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter className="bg-gray-50 dark:bg-navy-dark">
          <TableRow>
            <TableCell colSpan={3} className="dark:text-white">Total</TableCell>
            <TableCell className="dark:text-white">
              {currencyFormat(filteredSimulations.reduce((acc, sim) => {
                const totalDeductions = sim.inss + 
                                    (sim.educacao || 0) + 
                                    (sim.saude || 0) + 
                                    ((sim.dependentes || 0) * 2275.08) + 
                                    (sim.outras_deducoes || 0);
                return acc + totalDeductions;
              }, 0))}
            </TableCell>
            <TableCell className="dark:text-white">
              {currencyFormat(filteredSimulations.reduce((acc, sim) => acc + sim.imposto_estimado, 0))}
            </TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
};
