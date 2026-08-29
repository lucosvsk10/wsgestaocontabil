import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface UserSearchAndFilterProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortOrder: string;
  setSortOrder: (order: string) => void;
}

export const UserSearchAndFilter = ({ searchTerm, setSearchTerm, sortOrder, setSortOrder }: UserSearchAndFilterProps) => (
  <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm md:flex-row md:items-center">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Buscar acesso por nome ou e-mail..."
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        className="border-border/60 bg-background/70 pl-10 shadow-none"
      />
    </div>
    <Select value={sortOrder} onValueChange={setSortOrder}>
      <SelectTrigger className="w-full border-border/60 bg-background/70 shadow-none md:w-52">
        <SelectValue placeholder="Ordenar por" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="newest">Mais recente</SelectItem>
        <SelectItem value="oldest">Mais antigo</SelectItem>
      </SelectContent>
    </Select>
  </div>
);
