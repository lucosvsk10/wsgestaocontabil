
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TaxSimulation } from "@/types/tax-simulations";
import SimulationTableRow from "./SimulationTableRow";

interface SimulationsTableProps {
  simulations: TaxSimulation[];
  getUserName: (simulation: TaxSimulation) => string | null;
  getUserEmail: (simulation: TaxSimulation) => string | null;
}

const SimulationsTable = ({ simulations, getUserName, getUserEmail }: SimulationsTableProps) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-navy-lighter/30 shadow-md">
      <Table>
        <TableHeader className="bg-gray-50 dark:bg-navy-dark">
          <TableRow className="hover:bg-gray-100 dark:hover:bg-navy-medium/50">
            <TableHead className="dark:text-gray-300">Data</TableHead>
            <TableHead className="dark:text-gray-300">Nome</TableHead>
            <TableHead className="dark:text-gray-300">Contato</TableHead>
            <TableHead className="dark:text-gray-300">Rendimento</TableHead>
            <TableHead className="dark:text-gray-300">Deduções</TableHead>
            <TableHead className="dark:text-gray-300">Resultado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="dark:bg-navy-medium">
          {simulations.map(simulation => (
            <SimulationTableRow 
              key={simulation.id}
              simulation={simulation}
              getUserName={getUserName}
              getUserEmail={getUserEmail}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default SimulationsTable;
