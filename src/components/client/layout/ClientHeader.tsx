
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { UserCircle, LogOut, Home } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useNavigation } from "@/components/navbar/hooks/useNavigation";
import { Link } from "react-router-dom";

const ClientHeader = () => {
  const { user } = useAuth();
  const { handleLogout } = useNavigation();

  return (
    <header className="py-4 px-6 flex items-center justify-between bg-white dark:bg-[#0b1320] border-b border-[#e6e6e6] dark:border-[#efc349]/20">
      <div className="flex items-center">
        <h2 className="text-xl font-extralight text-[#020817] dark:text-[#efc349]">
          Área do Cliente
        </h2>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Theme toggle */}
        <ThemeToggle />
        
        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative h-10 w-10 rounded-full transition-all duration-300 ease-in-out hover:scale-105 border border-[#e6e6e6] hover:border-[#efc349]/50 dark:border-[#efc349]/30 dark:hover:border-[#efc349] dark:hover:bg-[#efc349]/10"
            >
              <UserCircle className="h-5 w-5 text-gray-600 dark:text-[#efc349]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-64 bg-white dark:bg-[#0b1320] border border-[#e6e6e6] dark:border-[#efc349]/30 shadow-xl rounded-xl backdrop-blur-sm"
          >
            <div className="px-4 py-3 text-sm font-medium text-[#020817] dark:text-white border-b border-[#e6e6e6] dark:border-[#efc349]/20">
              {user?.email || "Usuário"}
            </div>
            <DropdownMenuSeparator className="bg-[#e6e6e6] dark:bg-[#efc349]/20" />
            <DropdownMenuItem asChild className="text-[#020817] hover:bg-gray-50 focus:bg-gray-50 dark:text-white dark:hover:bg-[#efc349]/10 dark:focus:bg-[#efc349]/10 transition-all duration-300">
              <Link to="/" className="flex items-center px-3 py-2">
                <Home className="w-4 h-4 mr-2" />
                Voltar ao site
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleLogout} 
              className="text-[#020817] hover:bg-gray-50 focus:bg-gray-50 dark:text-white dark:hover:bg-[#efc349]/10 dark:focus:bg-[#efc349]/10 transition-all duration-300"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default ClientHeader;
