
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface UserSearchAndFilterProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortOrder: string;
  setSortOrder: (order: string) => void;
}

export const UserSearchAndFilter = ({
  searchTerm,
  setSearchTerm,
  sortOrder,
  setSortOrder
}: UserSearchAndFilterProps) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-8">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white dark:bg-[#0b0f1c] border-gray-200 dark:border-[#efc349]/30 font-extralight"
        />
      </div>
      <Select value={sortOrder} onValueChange={setSortOrder}>
        <SelectTrigger className="w-full md:w-48 bg-white dark:bg-[#0b0f1c] border-gray-200 dark:border-[#efc349]/30">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-[#0b0f1c] border-gray-200 dark:border-[#efc349]/30">
          <SelectItem value="newest" className="font-extralight">Mais recente</SelectItem>
          <SelectItem value="oldest" className="font-extralight">Mais antigo</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
