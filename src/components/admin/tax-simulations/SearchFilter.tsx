
import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchFilterProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

const SearchFilter = ({ searchTerm, setSearchTerm }: SearchFilterProps) => {
  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground dark:text-gray-400" />
      <Input 
        type="search" 
        placeholder="Buscar por nome, email..." 
        className="pl-8 bg-white dark:bg-navy-medium border-gray-200 dark:border-navy-lighter/30 rounded-lg" 
        value={searchTerm} 
        onChange={e => setSearchTerm(e.target.value)} 
      />
    </div>
  );
};

export default SearchFilter;
