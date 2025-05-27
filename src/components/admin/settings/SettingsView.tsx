import { useState } from "react";
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
  const {
    toast
  } = useToast();
  const {
    theme,
    setTheme
  } = useTheme();
  const {
    user,
    signOut
  } = useAuth();
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
      const {
        error
      } = await supabase.auth.updateUser({
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
  return <div className="space-y-12">
      <div className="mb-8">
        <h1 className="text-3xl text-[#020817] dark:text-[#efc349] mb-4 font-extralight">Configurações</h1>
        <p className="text-gray-600 dark:text-white/70">Gerencie suas configurações pessoais e do sistema</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Account Settings */}
        <div className="space-y-8">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-6 h-6 text-[#020817] dark:text-[#efc349]" />
            <h2 className="text-xl font-semibold text-[#020817] dark:text-[#efc349]">Segurança da Conta</h2>
          </div>
          
          {/* Password Change Form */}
          <form onSubmit={handleChangePassword} className="space-y-8">
            <div className="space-y-3">
              <Label htmlFor="currentPassword" className="text-[#020817] dark:text-white font-medium">Senha Atual</Label>
              <Input id="currentPassword" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="transition-all duration-300" />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="newPassword" className="text-[#020817] dark:text-white font-medium">Nova Senha</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="transition-all duration-300" />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="confirmPassword" className="text-[#020817] dark:text-white font-medium">Confirmar Senha</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="transition-all duration-300" />
            </div>
            
            {passwordError && <div className="text-sm text-red-500 dark:text-red-400 p-3 rounded-lg">{passwordError}</div>}
            
            <Button type="submit" className="w-full transition-all duration-300 hover:scale-105" disabled={isLoading}>
              <Lock className="mr-2 h-4 w-4" />
              Alterar Senha
            </Button>
          </form>
          
          <Button variant="destructive" className="w-full transition-all duration-300 hover:scale-105" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Fazer Logout
          </Button>
        </div>
        
        {/* System Settings */}
        <div className="space-y-8">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-6 h-6 text-[#020817] dark:text-[#efc349]" />
            <h2 className="text-xl font-semibold text-[#020817] dark:text-[#efc349]">Sistema</h2>
          </div>
          
          <div className="space-y-8">
            <div className="flex items-center justify-between p-6 rounded-xl bg-gray-50 dark:bg-transparent">
              <div className="flex items-center space-x-3">
                <Moon className="h-5 w-5 text-[#020817] dark:text-[#efc349]" />
                <span className="text-[#020817] dark:text-white font-medium">Modo Escuro</span>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} className="data-[state=checked]:bg-[#efc349]" />
            </div>
            
            <Button variant="outline" className="w-full transition-all duration-300 hover:scale-105" onClick={fetchDatabaseInfo} disabled={isLoading}>
              <Database className="mr-2 h-4 w-4" />
              Ver uso do banco de dados
            </Button>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="p-6 rounded-xl bg-gray-50 dark:bg-transparent space-y-3">
                <p className="text-sm font-medium text-gray-500 dark:text-white/70">Versão da aplicação</p>
                <p className="text-2xl font-bold text-[#020817] dark:text-white">2.0.0</p>
                <p className="text-xs text-gray-500 dark:text-white/50">Última atualização: 27/05/2025</p>
              </div>
              
              <div className="p-6 rounded-xl bg-gray-50 dark:bg-transparent space-y-3">
                <p className="text-sm font-medium text-gray-500 dark:text-white/70">Ambiente</p>
                <p className="text-2xl font-bold text-[#020817] dark:text-white">Produção</p>
                <p className="text-xs text-gray-500 dark:text-white/50">Status: OFFline</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Database Usage Dialog */}
      <Dialog open={openDatabaseDialog} onOpenChange={setOpenDatabaseDialog}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#020817] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-center text-[#020817] dark:text-[#efc349]">Uso do Banco de Dados</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="p-6 rounded-xl bg-gray-50 dark:bg-transparent space-y-3">
              <p className="text-sm font-medium text-gray-500 dark:text-white/70">Tamanho do Banco de Dados</p>
              <p className="text-2xl font-bold text-[#020817] dark:text-white">{dbSize}</p>
            </div>
            <div className="p-6 rounded-xl bg-gray-50 dark:bg-transparent space-y-3">
              <p className="text-sm font-medium text-gray-500 dark:text-white/70">Tamanho do Storage</p>
              <p className="text-2xl font-bold text-[#020817] dark:text-white">{storageSize}</p>
            </div>
            <div className="text-center text-sm text-gray-500 dark:text-white/70">
              Dados atualizados em: {new Date().toLocaleString()}
            </div>
          </div>
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setOpenDatabaseDialog(false)} className="transition-all duration-300 hover:scale-105">
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};