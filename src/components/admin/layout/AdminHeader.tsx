import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { UserCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useNavigation } from "@/components/navbar/hooks/useNavigation";
import { Link } from "react-router-dom";
import { AdminCompanySelector } from "./AdminCompanySelector";

interface AdminHeaderProps { sidebarOpen: boolean; setSidebarOpen: (open: boolean) => void; toggleSidebar: () => void; }

const AdminHeader = (_props: AdminHeaderProps) => {
  const { user } = useAuth();
  const { handleLogout } = useNavigation();
  return (
    <header className="relative flex h-20 shrink-0 items-center border-b border-border/60 bg-background px-4 text-foreground transition-colors sm:px-5 lg:px-6">
      <div className="hidden flex-1 lg:block" />
      <div className="min-w-0 flex-1 lg:flex lg:justify-center"><AdminCompanySelector /></div>
      <div className="flex flex-1 shrink-0 items-center justify-end gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg border border-border/60 hover:bg-muted/50"><UserCircle className="h-4.5 w-4.5 text-muted-foreground" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl">
            <div className="border-b border-border/60 px-4 py-3 text-sm font-medium">{user?.email || "Usuário"}</div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link to="/" className="flex items-center px-4 py-2">Voltar ao site</Link></DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}><span className="flex items-center px-4 py-2">Sair</span></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
export default AdminHeader;
