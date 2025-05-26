
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
    <header className="py-6 px-8 flex items-center justify-between bg-white dark:bg-[#020817]">
      <div className="flex items-center">
        {/* Conteúdo à esquerda */}
      </div>
      
      <div className="flex items-center space-x-6">
        {/* Theme toggle */}
        <ThemeToggle />
        
        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full border border-[#e6e6e6] hover:bg-gray-50 dark:border-[#efc349] dark:hover:bg-transparent dark:bg-transparent">
              <UserCircle className="h-6 w-6 text-[#efc349]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white shadow-lg rounded-lg border border-[#e6e6e6] dark:bg-transparent dark:border-[#efc349]">
            <div className="px-4 py-3 text-sm font-medium text-[#020817] dark:text-white">
              {user?.email || "Usuário"}
            </div>
            <DropdownMenuSeparator className="bg-[#e6e6e6] dark:bg-[#efc349]/30" />
            <DropdownMenuItem asChild className="text-[#020817] hover:bg-gray-50 focus:bg-gray-50 focus:text-[#020817] dark:text-white dark:hover:bg-transparent">
              <Link to="/" className="flex items-center">Voltar ao site</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-[#020817] hover:bg-gray-50 focus:bg-gray-50 focus:text-[#020817] dark:text-white dark:hover:bg-transparent">
              <span className="flex items-center">Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AdminHeader;
