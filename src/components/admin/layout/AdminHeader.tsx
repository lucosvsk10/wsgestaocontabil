
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
    <header className="py-6 px-8 flex items-center justify-between bg-white dark:bg-[#020817] border-b border-gray-100 dark:border-[#020817]">
      <div className="flex items-center">
        {/* Conteúdo à esquerda */}
      </div>
      
      <div className="flex items-center space-x-6">
        {/* Theme toggle */}
        <ThemeToggle />
        
        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-12 w-12 rounded-full transition-all duration-300 ease-in-out hover:scale-105 border border-gray-200 hover:border-gray-300 dark:border-[#efc349]/30 dark:hover:border-[#efc349] dark:hover:bg-[#efc349]/10">
              <UserCircle className="h-6 w-6 text-gray-600 dark:text-[#efc349]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-white dark:bg-[#020817] border border-gray-200 dark:border-[#efc349]/30 shadow-xl dark:shadow-none rounded-xl backdrop-blur-sm">
            <div className="px-4 py-3 text-sm font-medium text-[#020817] dark:text-white border-b border-gray-100 dark:border-[#efc349]/20">
              {user?.email || "Usuário"}
            </div>
            <DropdownMenuSeparator className="bg-gray-100 dark:bg-[#efc349]/20" />
            <DropdownMenuItem asChild className="text-[#020817] hover:bg-gray-50 focus:bg-gray-50 dark:text-white dark:hover:bg-[#efc349]/10 dark:focus:bg-[#efc349]/10 transition-all duration-300">
              <Link to="/" className="flex items-center px-4 py-2">Voltar ao site</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-[#020817] hover:bg-gray-50 focus:bg-gray-50 dark:text-white dark:hover:bg-[#efc349]/10 dark:focus:bg-[#efc349]/10 transition-all duration-300">
              <span className="flex items-center px-4 py-2">Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AdminHeader;
