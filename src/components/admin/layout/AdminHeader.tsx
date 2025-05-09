
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { BellIcon, UserCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useNavigation } from "@/components/navbar/hooks/useNavigation";

const AdminHeader = () => {
  const { user } = useAuth();
  const { handleLogout } = useNavigation();
  
  return (
    <header className="bg-white dark:bg-[#1E1E1E] border-b border-gray-200 dark:border-gray-800 py-3 px-4 flex items-center justify-between">
      <h1 className="text-xl font-medium">Área Administrativa</h1>
      
      <div className="flex items-center space-x-3">
        {/* Theme toggle */}
        <ThemeToggle />
        
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <BellIcon className="h-5 w-5" />
          <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
        </Button>
        
        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
              <UserCircle className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-sm font-medium">
              {user?.email || "Usuário"}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => window.location.href = "/"}>
              Voltar ao site
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleLogout}>
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AdminHeader;
