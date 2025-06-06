
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut } from "lucide-react";

const AdminNavbar = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="bg-white dark:bg-[#0b1320] border-b border-gray-200 dark:border-[#efc349]/20 px-4 py-3">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin")}
            className="border-gray-200 dark:border-[#efc349]/30 text-[#020817] dark:text-[#efc349] hover:bg-gray-50 dark:hover:bg-[#efc349]/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Button>
          <h1 className="text-xl font-extralight text-[#020817] dark:text-[#efc349]">
            Gerenciar Carrossel
          </h1>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          className="border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </nav>
  );
};

export default AdminNavbar;
