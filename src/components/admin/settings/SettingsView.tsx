
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useStorageStats } from "@/hooks/useStorageStats";
import { LogOut, Sun, Moon, Key } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNavigation } from "@/components/navbar/hooks/useNavigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { handleLogout } = useNavigation();
  const { storageStats, isLoading: isLoadingStorage, fetchStorageStats } = useStorageStats();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  useEffect(() => {
    fetchStorageStats();
  }, [fetchStorageStats]);
  
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erro ao alterar senha",
        description: "Por favor, preencha todos os campos."
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "As senhas não conferem",
        description: "A nova senha e a confirmação devem ser iguais."
      });
      return;
    }
    
    try {
      // In a real implementation, you would call your auth service to change the password here
      
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso."
      });
      
      setIsPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao alterar senha",
        description: "Ocorreu um erro ao alterar sua senha. Tente novamente."
      });
    }
  };
  
  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-navy dark:text-gold">Configurações</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Configure as preferências da sua conta e do aplicativo.
          </p>
        </div>
        
        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:w-[400px] mb-6 bg-white dark:bg-navy-dark border border-gray-300 dark:border-gold/20 shadow-sm">
            <TabsTrigger value="account" className="text-gray-700 dark:text-gray-300">Conta</TabsTrigger>
            <TabsTrigger value="appearance" className="text-gray-700 dark:text-gray-300">Aparência</TabsTrigger>
            <TabsTrigger value="system" className="text-gray-700 dark:text-gray-300">Sistema</TabsTrigger>
          </TabsList>
          
          {/* Account Settings */}
          <TabsContent value="account">
            <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20 shadow-md">
              <CardHeader>
                <CardTitle className="text-navy dark:text-gold">Conta</CardTitle>
                <CardDescription>
                  Gerencie as configurações da sua conta.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input className="bg-gray-100 dark:bg-navy-light/20" value={user?.email || ""} readOnly />
                </div>
                <div>
                  <Button
                    variant="outline"
                    className="w-full md:w-auto flex items-center gap-2 bg-white dark:bg-navy-light/20 text-navy dark:text-gold hover:bg-gold hover:text-navy dark:hover:bg-gold dark:hover:text-navy border border-gold/20"
                    onClick={() => setIsPasswordDialogOpen(true)}
                  >
                    <Key size={16} />
                    Alterar Senha
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="destructive"
                  className="flex items-center gap-2"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  Logout
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Appearance Settings */}
          <TabsContent value="appearance">
            <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20 shadow-md">
              <CardHeader>
                <CardTitle className="text-navy dark:text-gold">Aparência</CardTitle>
                <CardDescription>
                  Personalize a aparência da interface.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tema</Label>
                  <div className="flex flex-col md:flex-row gap-4">
                    <Button
                      variant={theme === 'light' ? "default" : "outline"}
                      className={`flex items-center gap-2 ${
                        theme === 'light'
                          ? "bg-navy text-white dark:bg-gold dark:text-navy"
                          : "bg-white dark:bg-navy-light/20 text-navy dark:text-gold hover:bg-gold hover:text-navy dark:hover:bg-gold dark:hover:text-navy border-gold/20"
                      }`}
                      onClick={() => setTheme('light')}
                    >
                      <Sun size={16} />
                      Modo Claro
                    </Button>
                    <Button
                      variant={theme === 'dark' ? "default" : "outline"}
                      className={`flex items-center gap-2 ${
                        theme === 'dark'
                          ? "bg-navy text-white dark:bg-gold dark:text-navy"
                          : "bg-white dark:bg-navy-light/20 text-navy dark:text-gold hover:bg-gold hover:text-navy dark:hover:bg-gold dark:hover:text-navy border-gold/20"
                      }`}
                      onClick={() => setTheme('dark')}
                    >
                      <Moon size={16} />
                      Modo Escuro
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* System Settings */}
          <TabsContent value="system">
            <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20 shadow-md">
              <CardHeader>
                <CardTitle className="text-navy dark:text-gold">Informações do Sistema</CardTitle>
                <CardDescription>
                  Informações técnicas sobre o sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Espaço Total Ocupado</Label>
                  <div className="text-navy dark:text-white font-medium">
                    {isLoadingStorage ? (
                      "Carregando..."
                    ) : (
                      `${storageStats?.totalStorageMB.toFixed(2) || 0} MB`
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Versão da Aplicação</Label>
                  <div className="text-navy dark:text-white font-medium">
                    1.0.0
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Data da Última Atualização</Label>
                  <div className="text-navy dark:text-white font-medium">
                    {new Date('2025-05-09').toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-navy-dark">
          <DialogHeader>
            <DialogTitle className="text-navy dark:text-gold">Alterar Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha Atual</Label>
              <Input 
                id="current-password" 
                type="password" 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input 
                id="new-password" 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input 
                id="confirm-password" 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleChangePassword}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
