
import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface DocumentSearchAndFilterProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  dateFilter?: string;
  setDateFilter?: (date: string) => void;
  sortBy?: string;
  setSortBy?: (sort: string) => void;
  onClearFilters: () => void;
}

export const DocumentSearchAndFilter = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  dateFilter,
  setDateFilter,
  sortBy,
  setSortBy,
  onClearFilters
}: DocumentSearchAndFilterProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="bg-[#1a1f2e] border border-[#2a3441] rounded-xl p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input 
            type="text" 
            placeholder="Buscar documentos..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#0b1320] border-[#2a3441] text-white placeholder:text-gray-400"
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-[#0b1320] border-[#2a3441] text-white">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1f2e] border-[#2a3441] text-white">
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="new">Novos</SelectItem>
              <SelectItem value="viewed">Visualizados</SelectItem>
              <SelectItem value="expired">Expirados</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Date Filter */}
          {setDateFilter && (
            <Input
              type="date"
              value={dateFilter || ""}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-[160px] bg-[#0b1320] border-[#2a3441] text-white"
              placeholder="dd/mm/yyyy"
            />
          )}

          {/* Sort Filter */}
          {setSortBy && (
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px] bg-[#0b1320] border-[#2a3441] text-white">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1f2e] border-[#2a3441] text-white">
                <SelectItem value="date-desc">Mais recentes</SelectItem>
                <SelectItem value="date-asc">Mais antigos</SelectItem>
                <SelectItem value="name-asc">Nome A-Z</SelectItem>
                <SelectItem value="name-desc">Nome Z-A</SelectItem>
              </SelectContent>
            </Select>
          )}
          
          {/* Clear Filters Button */}
          <Button
            onClick={onClearFilters}
            variant="outline"
            className="bg-[#0b1320] border-[#2a3441] text-white hover:bg-[#2a3441]"
          >
            <X size={16} className="mr-1" />
            {isMobile ? "Limpar" : "Limpar filtros"}
          </Button>
        </div>
      </div>
    </div>
  );
};
