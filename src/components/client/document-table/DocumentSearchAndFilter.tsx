
import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuCheckboxItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";

interface DocumentSearchAndFilterProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
}

export const DocumentSearchAndFilter = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy
}: DocumentSearchAndFilterProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 bg-white/50 dark:bg-navy-light/10 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gold/20">
      <div className="relative flex-grow">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" size={18} />
        <Input 
          type="text" 
          placeholder="Buscar documentos..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/80 dark:bg-navy-light/20 border-gray-300/50 dark:border-gold/20 focus:border-gray-400 dark:focus:border-gold/40 shadow-sm"
        />
      </div>
      
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-white/80 dark:bg-navy-light/20 border-gray-300/50 dark:border-gold/20 shadow-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-navy-dark border-gray-200 dark:border-gold/20">
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="new">Novos</SelectItem>
            <SelectItem value="viewed">Visualizados</SelectItem>
            <SelectItem value="expired">Expirados</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px] bg-white/80 dark:bg-navy-light/20 border-gray-300/50 dark:border-gold/20 shadow-sm">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-navy-dark border-gray-200 dark:border-gold/20">
            <SelectItem value="date-desc">Data: Recentes primeiro</SelectItem>
            <SelectItem value="date-asc">Data: Antigos primeiro</SelectItem>
            <SelectItem value="name-asc">Nome: A-Z</SelectItem>
            <SelectItem value="name-desc">Nome: Z-A</SelectItem>
          </SelectContent>
        </Select>
        
        {!isMobile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-white/80 dark:bg-navy-light/20 border-gray-300/50 dark:border-gold/20 shadow-sm hover:bg-gray-50 dark:hover:bg-navy-light/30">
                <Filter size={18} />
                <span className="ml-1">Filtros</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-navy-dark border-gray-200 dark:border-gold/20">
              <DropdownMenuCheckboxItem
                checked={statusFilter === "new"}
                onCheckedChange={() => setStatusFilter(statusFilter === "new" ? "all" : "new")}
              >
                Apenas novos
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === "expired"}
                onCheckedChange={() => setStatusFilter(statusFilter === "expired" ? "all" : "expired")}
              >
                Apenas expirados
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};
