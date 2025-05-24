
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
  
  return (
    <header className="py-4 px-6 flex items-center justify-between bg-white border-b border-[#e6e6e6] dark:bg-[#020817] dark:border-none">
      <div className="flex items-center">
        {/* Conteúdo à esquerda */}
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Theme toggle */}
        <ThemeToggle />
        
        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full border border-[#e6e6e6] hover:bg-gray-50 dark:border dark:border-[#efc349] dark:hover:bg-[#efc349]/10">
              <UserCircle className="h-6 w-6 text-[#efc349]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white shadow-sm rounded-lg border border-[#e6e6e6] dark:bg-transparent dark:border dark:border-[#efc349]">
            <div className="px-3 py-2 text-sm font-medium text-[#020817] dark:text-white">
              {user?.email || "Usuário"}
            </div>
            <DropdownMenuSeparator className="bg-[#e6e6e6] dark:bg-[#efc349]/30" />
            <DropdownMenuItem asChild className="text-[#020817] hover:bg-gray-50 focus:bg-gray-50 focus:text-[#020817] dark:text-white dark:hover:bg-[#efc349]/10">
              <Link to="/" className="flex items-center">Voltar ao site</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-[#020817] hover:bg-gray-50 focus:bg-gray-50 focus:text-[#020817] dark:text-white dark:hover:bg-[#efc349]/10">
              <span className="flex items-center">Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AdminHeader;
