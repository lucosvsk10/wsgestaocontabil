
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { UserCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useNavigation } from "@/components/navbar/hooks/useNavigation";
import { Link } from "react-router-dom";
import NotificationHeader from "@/components/notifications/NotificationHeader";

const AdminHeader = () => {
  const {
    user
  } = useAuth();
  const {
    handleLogout
  } = useNavigation();
  
  return <header className="border-b border-gray-200 dark:border-navy-lighter/30 py-3 px-4 flex items-center justify-between bg-white shadow-md dark:bg-navy-dark">
      <h1 className="text-xl font-semibold text-navy dark:text-gold">
        WS GESTÃO CONTÁBIL | Área Administrativa
      </h1>
      
      <div className="flex items-center space-x-3">
        {/* Theme toggle */}
        <ThemeToggle />
        
        {/* Notifications */}
        <NotificationHeader />
        
        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
              <UserCircle className="h-6 w-6 text-navy dark:text-gold" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 dark:bg-navy-medium dark:border-navy-lighter/30 shadow-md">
            <div className="px-2 py-1.5 text-sm font-medium text-navy-dark dark:text-white">
              {user?.email || "Usuário"}
            </div>
            <DropdownMenuSeparator className="dark:bg-navy-lighter/30" />
            <DropdownMenuItem asChild className="dark:text-white dark:focus:bg-navy-lighter focus:bg-gray-100 focus:text-navy-dark">
              <Link to="/">Voltar ao site</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="dark:text-white dark:focus:bg-navy-lighter focus:bg-gray-100 focus:text-navy-dark">
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>;
};

export default AdminHeader;
