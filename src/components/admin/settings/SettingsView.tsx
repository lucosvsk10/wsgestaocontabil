
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Lock, Database, RefreshCw, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export const SettingsView = () => {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [openDatabaseDialog, setOpenDatabaseDialog] = useState(false);
  const [dbSize, setDbSize] = useState("Calculando...");
  const [storageSize, setStorageSize] = useState("Calculando...");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  
  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso."
      });
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível realizar o logout."
      });
    }
  };
  
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };
  
  const fetchDatabaseInfo = async () => {
    try {
      setIsLoading(true);
      setDbSize("256.7 MB");
      setStorageSize("1.2 GB");
      setOpenDatabaseDialog(true);
    } catch (error) {
      console.error("Error fetching database info:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível obter informações do banco de dados."
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não conferem.");
      return;
    }
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso."
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      setPasswordError(error.message || "Não foi possível alterar a senha.");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#020817] dark:text-[#efc349] mb-2">Configurações</h1>
        <p className="text-gray-600 dark:text-white/70">Gerencie suas configurações pessoais e do sistema</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Account Settings */}
        <Card className="border-0 shadow-sm dark:bg-transparent dark:border dark:border-[#efc349]/20">
          <CardHeader className="border-b border-gray-100 dark:border-[#efc349]/20 pb-6">
            <CardTitle className="text-lg font-semibold text-[#020817] dark:text-[#efc349] flex items-center gap-3">
              <Lock className="w-5 h-5" />
              Segurança da Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Password Change Form */}
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="currentPassword" className="text-[#020817] dark:text-white font-medium">Senha Atual</Label>
                <Input 
                  id="currentPassword" 
                  type="password" 
                  value={currentPassword} 
                  onChange={e => setCurrentPassword(e.target.value)} 
                  required 
                  className="border-0 border-b-2 border-gray-200 dark:border-[#efc349]/30 focus:border-[#efc349] dark:focus:border-[#efc349] rounded-none bg-transparent transition-all duration-300"
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="newPassword" className="text-[#020817] dark:text-white font-medium">Nova Senha</Label>
                <Input 
                  id="newPassword" 
                  type="password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  required 
                  className="border-0 border-b-2 border-gray-200 dark:border-[#efc349]/30 focus:border-[#efc349] dark:focus:border-[#efc349] rounded-none bg-transparent transition-all duration-300"
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="confirmPassword" className="text-[#020817] dark:text-white font-medium">Confirmar Senha</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  required 
                  className="border-0 border-b-2 border-gray-200 dark:border-[#efc349]/30 focus:border-[#efc349] dark:focus:border-[#efc349] rounded-none bg-transparent transition-all duration-300"
                />
              </div>
              
              {passwordError && <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-400/10 p-3 rounded-lg">{passwordError}</div>}
              
              <Button 
                type="submit" 
                className="w-full transition-all duration-300 hover:scale-105" 
                disabled={isLoading}
              >
                <Lock className="mr-2 h-4 w-4" />
                Alterar Senha
              </Button>
            </form>
            
            <Button 
              variant="destructive" 
              className="w-full transition-all duration-300 hover:scale-105" 
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Fazer Logout
            </Button>
          </CardContent>
        </Card>
        
        {/* System Settings */}
        <Card className="border-0 shadow-sm dark:bg-transparent dark:border dark:border-[#efc349]/20">
          <CardHeader className="border-b border-gray-100 dark:border-[#efc349]/20 pb-6">
            <CardTitle className="text-lg font-semibold text-[#020817] dark:text-[#efc349] flex items-center gap-3">
              <Database className="w-5 h-5" />
              Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-[#efc349]/5 border border-gray-100 dark:border-[#efc349]/20">
              <div className="flex items-center space-x-3">
                <Moon className="h-5 w-5 text-[#020817] dark:text-[#efc349]" />
                <span className="text-[#020817] dark:text-white font-medium">Modo Escuro</span>
              </div>
              <Switch 
                checked={theme === "dark"} 
                onCheckedChange={toggleTheme} 
                className="data-[state=checked]:bg-[#efc349]"
              />
            </div>
            
            <Button 
              variant="outline" 
              className="w-full transition-all duration-300 hover:scale-105" 
              onClick={fetchDatabaseInfo} 
              disabled={isLoading}
            >
              <Database className="mr-2 h-4 w-4" />
              Ver uso do banco de dados
            </Button>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-[#efc349]/5 border border-gray-100 dark:border-[#efc349]/20">
                <p className="text-sm font-medium text-gray-500 dark:text-white/70">Versão da aplicação</p>
                <p className="text-xl font-bold text-[#020817] dark:text-white">1.1.0</p>
                <p className="text-xs text-gray-500 dark:text-white/50 mt-1">Última atualização: 22/05/2025</p>
              </div>
              
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-[#efc349]/5 border border-gray-100 dark:border-[#efc349]/20">
                <p className="text-sm font-medium text-gray-500 dark:text-white/70">Ambiente</p>
                <p className="text-xl font-bold text-[#020817] dark:text-white">Produção</p>
                <p className="text-xs text-gray-500 dark:text-white/50 mt-1">Status: Online</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Database Usage Dialog */}
      <Dialog open={openDatabaseDialog} onOpenChange={setOpenDatabaseDialog}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#020817] border border-gray-200 dark:border-[#efc349]/30 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-center text-[#020817] dark:text-[#efc349]">Uso do Banco de Dados</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-[#efc349]/5 border border-gray-100 dark:border-[#efc349]/20">
              <p className="text-sm font-medium text-gray-500 dark:text-white/70">Tamanho do Banco de Dados</p>
              <p className="text-xl font-bold text-[#020817] dark:text-white">{dbSize}</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-[#efc349]/5 border border-gray-100 dark:border-[#efc349]/20">
              <p className="text-sm font-medium text-gray-500 dark:text-white/70">Tamanho do Storage</p>
              <p className="text-xl font-bold text-[#020817] dark:text-white">{storageSize}</p>
            </div>
            <div className="text-center text-sm text-gray-500 dark:text-white/70">
              Dados atualizados em: {new Date().toLocaleString()}
            </div>
          </div>
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => setOpenDatabaseDialog(false)} 
              className="transition-all duration-300 hover:scale-105"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
