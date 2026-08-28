
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { UserCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useNavigation } from "@/components/navbar/hooks/useNavigation";
import { Link } from "react-router-dom";

interface AdminHeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const AdminHeader = ({ sidebarOpen, setSidebarOpen, toggleSidebar }: AdminHeaderProps) => {
  const { user } = useAuth();
  const { handleLogout } = useNavigation();

  return (
    <header className="py-6 px-8 flex items-center justify-between bg-background text-foreground border-b border-border/60 transition-colors duration-200">
      <div className="flex items-center" />
      
      <div className="flex items-center space-x-6">
        <ThemeToggle />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-12 w-12 rounded-full transition-all duration-300 ease-in-out hover:scale-105 border border-border hover:bg-muted/60 dark:hover:border-[#efc349]/70">
              <UserCircle className="h-6 w-6 text-muted-foreground dark:text-[#efc349]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-popover text-popover-foreground border border-border shadow-xl rounded-xl backdrop-blur-sm">
            <div className="px-4 py-3 text-sm font-medium border-b border-border/60">
              {user?.email || "Usuário"}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="hover:bg-muted/60 focus:bg-muted/60 transition-all duration-300">
              <Link to="/" className="flex items-center px-4 py-2">Voltar ao site</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="hover:bg-muted/60 focus:bg-muted/60 transition-all duration-300">
              <span className="flex items-center px-4 py-2">Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AdminHeader;
