
import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSortBy("date-desc");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || sortBy !== "date-desc";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extralight text-[#020817] dark:text-[#efc349]">
          Filtros e Busca
        </h2>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-gray-500 dark:text-gray-400 hover:text-[#020817] dark:hover:text-[#efc349] font-extralight"
          >
            <X className="w-4 h-4 mr-2" />
            Limpar filtros
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
          <Input 
            placeholder="Buscar documentos..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-transparent border-gray-300 dark:border-[#efc349]/30 text-[#020817] dark:text-white focus:border-[#efc349] dark:focus:border-[#efc349] transition-all duration-300 font-extralight"
          />
        </div>
        
        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-transparent border-gray-300 dark:border-[#efc349]/30 text-[#020817] dark:text-white focus:border-[#efc349] dark:focus:border-[#efc349] font-extralight">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-[#020817] border-gray-200 dark:border-[#efc349]/30">
            <SelectItem value="all" className="font-extralight">Todos os status</SelectItem>
            <SelectItem value="new" className="font-extralight">Novos</SelectItem>
            <SelectItem value="viewed" className="font-extralight">Visualizados</SelectItem>
            <SelectItem value="expired" className="font-extralight">Expirados</SelectItem>
            <SelectItem value="active" className="font-extralight">Ativos</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Filter */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="bg-transparent border-gray-300 dark:border-[#efc349]/30 text-[#020817] dark:text-white focus:border-[#efc349] dark:focus:border-[#efc349] font-extralight">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-[#020817] border-gray-200 dark:border-[#efc349]/30">
            <SelectItem value="date-desc" className="font-extralight">Data (mais recente)</SelectItem>
            <SelectItem value="date-asc" className="font-extralight">Data (mais antigo)</SelectItem>
            <SelectItem value="name-asc" className="font-extralight">Nome (A-Z)</SelectItem>
            <SelectItem value="name-desc" className="font-extralight">Nome (Z-A)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
