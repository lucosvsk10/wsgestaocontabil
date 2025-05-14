
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

interface SimulationFiltersProps {
  searchTerm: string;
  timeFilter: string;
  typeFilter: string;
  onSearchChange: (value: string) => void;
  onTimeFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
}

export const SimulationFilters = ({
  searchTerm,
  timeFilter,
  typeFilter,
  onSearchChange,
  onTimeFilterChange,
  onTypeFilterChange
}: SimulationFiltersProps) => {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground dark:text-gray-400" />
        <Input 
          type="search" 
          placeholder="Buscar por nome, email..." 
          className="pl-8 bg-white dark:bg-navy-medium border-gray-200 dark:border-navy-lighter/30 rounded-lg" 
          value={searchTerm} 
          onChange={e => onSearchChange(e.target.value)} 
        />
      </div>
      
      <div className="flex gap-2">
        <Select value={timeFilter} onValueChange={onTimeFilterChange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="week">Última semana</SelectItem>
            <SelectItem value="month">Último mês</SelectItem>
            <SelectItem value="quarter">Último trimestre</SelectItem>
            <SelectItem value="year">Último ano</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={typeFilter} onValueChange={onTypeFilterChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo de Declaração" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pagar">A Pagar</SelectItem>
            <SelectItem value="restituir">Restituição</SelectItem>
            <SelectItem value="completa">Modelo Completo</SelectItem>
            <SelectItem value="simplificada">Modelo Simplificado</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
