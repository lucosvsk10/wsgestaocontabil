
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { UserCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useNavigation } from "@/components/navbar/hooks/useNavigation";
import { Link } from "react-router-dom";

const AdminHeader = () => {
  const {
    user
  } = useAuth();
  const {
    handleLogout
  } = useNavigation();
  return <header className="border-b border-gold/20 py-4 px-6 flex items-center justify-between bg-deepNavy">
      <div className="flex items-center">
        
        
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Theme toggle */}
        <ThemeToggle />
        
        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full border border-gold/40 hover:bg-gold/10">
              <UserCircle className="h-6 w-6 text-gold" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 dark:bg-deepNavy dark:backdrop-blur-sm dark:border-gold/30 border shadow-lg rounded-xl">
            <div className="px-3 py-2 text-sm font-medium text-navy-dark dark:text-white">
              {user?.email || "Usuário"}
            </div>
            <DropdownMenuSeparator className="dark:bg-gold/30" />
            <DropdownMenuItem asChild className="dark:text-white hover:bg-gray-100 dark:hover:bg-gold/10 focus:bg-gray-100 focus:text-navy-dark">
              <Link to="/" className="flex items-center">Voltar ao site</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="dark:text-white hover:bg-gray-100 dark:hover:bg-gold/10 focus:bg-gray-100 focus:text-navy-dark">
              <span className="flex items-center">Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>;
};

export default AdminHeader;
