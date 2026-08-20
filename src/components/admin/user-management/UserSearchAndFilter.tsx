
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
    <div className="admin-toolbar">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar empresa, responsável ou e-mail"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-9 border-[var(--admin-line)] bg-transparent pl-10 text-sm shadow-none"
        />
      </div>
      <Select value={sortOrder} onValueChange={setSortOrder}>
        <SelectTrigger className="h-9 w-full border-[var(--admin-line)] bg-transparent shadow-none md:w-48">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Cadastro mais recente</SelectItem>
          <SelectItem value="oldest">Cadastro mais antigo</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
