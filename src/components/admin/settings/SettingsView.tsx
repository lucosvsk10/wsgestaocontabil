
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Database, LogOut, Lock } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { toast } = useToast();
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logout();
      navigate('/login');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "As senhas não coincidem",
        description: "Por favor, verifique se as senhas digitadas são iguais."
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres."
      });
      return;
    }
    
    try {
      setIsChangingPassword(true);
      
      // Update password via Supabase Auth API
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast({
        title: "Senha atualizada",
        description: "Sua senha foi alterada com sucesso."
      });
      
      // Clear form
      setNewPassword('');
      setConfirmPassword('');
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar senha",
        description: error.message
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Mock data for database usage
  const databaseInfo = {
    storageSize: "20.5 MB",
    databaseSize: "32.1 MB",
    totalSize: "52.6 MB",
    lastBackup: "09/05/2025",
  };
  
  // System information
  const systemInfo = {
    version: "v1.2.5",
    lastUpdate: "01/05/2025",
    environment: "Produção"
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-navy dark:text-gold">Configurações</h2>
      
      {/* Account Settings */}
      <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-navy dark:text-gold">Conta de Administrador</CardTitle>
          <CardDescription>Gerencie suas configurações de conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ''} readOnly className="bg-gray-50 dark:bg-gray-900" />
            </div>
            <div>
              <Label htmlFor="last-login">Último Login</Label>
              <Input id="last-login" value={new Date(user?.last_sign_in_at || '').toLocaleString() || 'N/A'} readOnly className="bg-gray-50 dark:bg-gray-900" />
            </div>
          </div>
          
          <form onSubmit={handlePasswordChange} className="border-t pt-4 border-gray-200 dark:border-gray-700 mt-4">
            <h3 className="text-md font-medium mb-4 text-navy dark:text-gold">Alterar Senha</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input 
                  id="new-password" 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  placeholder="Nova senha"
                  required
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirme a Senha</Label>
                <Input 
                  id="confirm-password" 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="Confirme a nova senha"
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="mt-4 bg-navy text-white hover:bg-navy/80 dark:bg-gold dark:text-navy dark:hover:bg-gold/80"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? 'Alterando...' : 'Alterar Senha'}
              {!isChangingPassword && <Lock size={16} className="ml-2" />}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Theme Settings */}
      <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-navy dark:text-gold">Aparência</CardTitle>
          <CardDescription>Gerencie o tema do sistema</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="font-medium text-navy dark:text-gold">Tema atual: {theme === 'dark' ? 'Escuro' : 'Claro'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Altere entre o modo claro e escuro</p>
          </div>
          <ThemeToggle />
        </CardContent>
      </Card>
      
      {/* Database Usage */}
      <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-navy dark:text-gold">Uso do Banco de Dados</CardTitle>
          <CardDescription>Informações sobre armazenamento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Armazenamento</p>
              <p className="font-medium text-navy dark:text-gold">{databaseInfo.storageSize}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Banco de Dados</p>
              <p className="font-medium text-navy dark:text-gold">{databaseInfo.databaseSize}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tamanho Total</p>
              <p className="font-medium text-navy dark:text-gold">{databaseInfo.totalSize}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Último Backup</p>
              <p className="font-medium text-navy dark:text-gold">{databaseInfo.lastBackup}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="mt-2 bg-navy/10 text-navy hover:bg-navy hover:text-white dark:bg-gold/10 dark:text-gold dark:hover:bg-gold dark:hover:text-navy"
          >
            <Database size={16} className="mr-2" />
            Ver Detalhes do Banco de Dados
          </Button>
        </CardContent>
      </Card>
      
      {/* System Information */}
      <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-navy dark:text-gold">Informações do Sistema</CardTitle>
          <CardDescription>Detalhes sobre a versão atual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Versão</p>
              <p className="font-medium text-navy dark:text-gold">{systemInfo.version}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Última Atualização</p>
              <p className="font-medium text-navy dark:text-gold">{systemInfo.lastUpdate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ambiente</p>
              <p className="font-medium text-navy dark:text-gold">{systemInfo.environment}</p>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button 
              variant="destructive" 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleLogout}
              disabled={isLoading}
            >
              {isLoading ? 'Processando...' : 'Sair do Sistema'}
              {!isLoading && <LogOut size={16} className="ml-2" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
