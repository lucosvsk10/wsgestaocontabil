
import { ChevronDown, ChevronUp, FileText, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { TaxSimulation } from "@/types/taxSimulation";
import { UserDetails, SortConfig } from "./types";
import { currencyFormat } from "@/utils/taxCalculations";

interface SimulationTableProps {
  filteredSimulations: TaxSimulation[];
  userDetails: UserDetails;
  sortConfig: SortConfig;
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
  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-navy-lighter/30 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 dark:bg-navy-light/20">
            <TableHead 
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-navy-light/40 transition-colors w-[180px]"
              onClick={() => onRequestSort('data_criacao')}
            >
              <div className="flex items-center gap-1">
                Data
                {getSortIcon('data_criacao')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-navy-light/40 transition-colors"
              onClick={() => onRequestSort('nome')}
            >
              <div className="flex items-center gap-1">
                Nome/Email
                {getSortIcon('nome')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-navy-light/40 transition-colors hidden md:table-cell"
              onClick={() => onRequestSort('tipo_simulacao')}
            >
              <div className="flex items-center gap-1">
                Tipo
                {getSortIcon('tipo_simulacao')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-navy-light/40 transition-colors hidden md:table-cell"
              onClick={() => onRequestSort('rendimento_bruto')}
            >
              <div className="flex items-center gap-1">
                Rendimento
                {getSortIcon('rendimento_bruto')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-navy-light/40 transition-colors"
              onClick={() => onRequestSort('imposto_estimado')}
            >
              <div className="flex items-center gap-1">
                Imposto
                {getSortIcon('imposto_estimado')}
              </div>
            </TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredSimulations.map((simulation) => {
            const userName = 
              simulation.user_id && userDetails[simulation.user_id]?.name
                ? userDetails[simulation.user_id].name 
                : simulation.nome || "Anônimo";
                
            const userEmail = 
              simulation.user_id && userDetails[simulation.user_id]?.email
                ? userDetails[simulation.user_id].email
                : simulation.email || "";
                
            return (
              <TableRow key={simulation.id} className="group">
                <TableCell className="font-medium">
                  {new Date(simulation.data_criacao).toLocaleDateString('pt-BR')}
                  <div className="text-xs text-muted-foreground dark:text-gray-400">
                    {new Date(simulation.data_criacao).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{userName}</div>
                  {userEmail && (
                    <div className="text-sm text-muted-foreground dark:text-gray-400">
                      {userEmail}
                    </div>
                  )}
                  {simulation.telefone && (
                    <div className="text-sm text-muted-foreground dark:text-gray-400 md:hidden">
                      Tel: {simulation.telefone}
                    </div>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span 
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      simulation.tipo_simulacao === 'a pagar'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    }`}
                  >
                    {simulation.tipo_simulacao === 'a pagar' 
                      ? 'A pagar' 
                      : 'Restituição'
                    }
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {currencyFormat(simulation.rendimento_bruto)}
                </TableCell>
                <TableCell>
                  <span 
                    className={`font-medium ${
                      simulation.tipo_simulacao === 'a pagar'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    {currencyFormat(simulation.imposto_estimado)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end items-center gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewDetails(simulation)}
                      className="h-8 w-8"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">Ver detalhes</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onGeneratePDF(simulation)}
                      className="h-8 w-8"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="sr-only">Gerar PDF</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onOpenObservations(simulation)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Adicionar observações</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
