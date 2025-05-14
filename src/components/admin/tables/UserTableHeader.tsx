
import { useState } from "react";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

interface UserTableHeaderProps {
  isAdminSection: boolean;
  sortDirection: 'asc' | 'desc' | null;
  toggleSort: () => void;
}

export const UserTableHeader = ({ 
  isAdminSection, 
  sortDirection, 
  toggleSort 
}: UserTableHeaderProps) => {
  const getSortIcon = () => {
    if (sortDirection === 'asc') return <ArrowUp size={16} />;
    if (sortDirection === 'desc') return <ArrowDown size={16} />;
    return <ArrowUpDown size={16} />;
  };
  
  return (
    <TableHeader>
      <TableRow className="border-gray-200 dark:border-gold/20">
        {!isAdminSection && (
          <TableHead className="text-navy-dark dark:text-gold font-medium uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <span>Nome</span>
              <Button
                variant="ghost" 
                size="icon"
                className="h-6 w-6 p-0"
                onClick={toggleSort}
                aria-label={sortDirection === 'asc' ? 'Ordenar de Z a A' : 'Ordenar de A a Z'}
              >
                {getSortIcon()}
              </Button>
            </div>
          </TableHead>
        )}
        <TableHead className="text-navy-dark dark:text-gold font-medium uppercase tracking-wider">Email</TableHead>
        <TableHead className="text-navy-dark dark:text-gold font-medium uppercase tracking-wider">Data de Cadastro</TableHead>
        {!isAdminSection && (
          <TableHead className="text-navy-dark dark:text-gold font-medium uppercase tracking-wider">Ações</TableHead>
        )}
      </TableRow>
    </TableHeader>
  );
};
