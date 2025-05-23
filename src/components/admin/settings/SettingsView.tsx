
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Lock, Database, RefreshCw, Moon, Sun } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
      // In a real implementation, you would fetch this information from a
      // Supabase Edge Function with admin privileges. For now, we'll simulate.
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
  
  return <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6 text-navy dark:text-gold">Configurações</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Settings */}
        <Card className="bg-white dark:bg-transparent border border-gray-200 dark:border-gold dark:border-opacity-20">
          <CardHeader className="border-b border-gray-200 dark:border-gold dark:border-opacity-20">
            <CardTitle className="text-lg font-semibold text-navy dark:text-gold">
              Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Password Change Form */}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-navy dark:text-gold">Senha Atual</Label>
                <Input id="currentPassword" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="bg-white dark:bg-transparent dark:border-gold dark:border-opacity-30" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-navy dark:text-gold">Nova Senha</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="bg-white dark:bg-transparent dark:border-gold dark:border-opacity-30" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-navy dark:text-gold">Confirmar Senha</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="bg-white dark:bg-transparent dark:border-gold dark:border-opacity-30" />
              </div>
              
              {passwordError && <div className="text-sm text-red-500 dark:text-red-400">{passwordError}</div>}
              
              <Button type="submit" className="w-full bg-navy text-white hover:bg-navy/80 dark:bg-transparent dark:border dark:border-gold dark:text-[#d9d9d9] dark:hover:bg-gold/10" disabled={isLoading}>
                <Lock className="mr-2 h-4 w-4" />
                Alterar Senha
              </Button>
            </form>
            
            <Button variant="destructive" className="w-full" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Fazer Logout
            </Button>
          </CardContent>
        </Card>
        
        {/* System Settings */}
        <Card className="bg-white dark:bg-transparent border border-gray-200 dark:border-gold dark:border-opacity-20">
          <CardHeader className="border-b border-gray-200 dark:border-gold dark:border-opacity-20">
            <CardTitle className="text-lg font-semibold text-navy dark:text-gold">
              Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Moon className="h-5 w-5 text-navy dark:text-gold" />
                <span className="text-navy dark:text-gold">Modo Escuro</span>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
            </div>
            
            <Button variant="outline" className="w-full dark:border-gold dark:border-opacity-30 dark:text-[#d9d9d9]" onClick={fetchDatabaseInfo} disabled={isLoading}>
              <Database className="mr-2 h-4 w-4" />
              Ver uso do banco de dados
            </Button>
            
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-navy-light/20">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Versão da aplicação</p>
              <p className="text-xl font-bold text-navy dark:text-white">1.1.0</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Última atualização: 22/05/2025</p>
            </div>
            
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-navy-light/20">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ambiente</p>
              <p className="text-xl font-bold text-navy dark:text-white">Produção</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Status: Online</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Database Usage Dialog */}
      <Dialog open={openDatabaseDialog} onOpenChange={setOpenDatabaseDialog}>
        <DialogContent className="sm:max-w-md dark:bg-transparent dark:border-gold dark:border-opacity-30 dark:backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-navy dark:text-gold">Uso do Banco de Dados</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-navy-light/20">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tamanho do Banco de Dados</p>
              <p className="text-xl font-bold text-navy dark:text-white">{dbSize}</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-navy-light/20">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tamanho do Storage</p>
              <p className="text-xl font-bold text-navy dark:text-white">{storageSize}</p>
            </div>
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Dados atualizados em: {new Date().toLocaleString()}
            </div>
          </div>
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setOpenDatabaseDialog(false)} className="dark:border-gold dark:border-opacity-30 dark:text-[#d9d9d9]">
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
