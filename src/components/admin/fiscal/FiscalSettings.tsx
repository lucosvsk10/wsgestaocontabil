
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, AlertTriangle, Clock, Globe } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const FiscalSettings = () => {
  const [settings, setSettings] = useState({
    apiEndpoint: '',
    syncInterval: '24',
    autoSync: true,
    retentionDays: '365',
    maxRetries: '3',
    timeout: '300',
    enableNotifications: true,
    notificationEmail: '',
    enableLogs: true,
    logLevel: 'info'
  });

  const handleSave = () => {
    // Aqui seria implementada a lógica para salvar as configurações
    toast.success("Configurações salvas com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#020817] dark:text-white">
          Configurações do Sistema
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure as opções de sincronização e comportamento do sistema
        </p>
      </div>

      {/* API Configuration */}
      <Card className="bg-white/80 dark:bg-[#020817]/80 backdrop-blur-sm border-[#efc349]/20">
        <CardHeader>
          <CardTitle className="text-[#020817] dark:text-white flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            Configuração da API
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Configure a conexão com a API externa de coleta fiscal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiEndpoint" className="text-[#020817] dark:text-white">
              Endpoint da API
            </Label>
            <Input
              id="apiEndpoint"
              placeholder="https://api.exemplo.com/fiscal"
              value={settings.apiEndpoint}
              onChange={(e) => setSettings({...settings, apiEndpoint: e.target.value})}
              className="border-[#efc349]/20 focus:border-[#efc349]"
            />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              URL da API externa para coleta de documentos fiscais
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeout" className="text-[#020817] dark:text-white">
                Timeout (segundos)
              </Label>
              <Input
                id="timeout"
                type="number"
                value={settings.timeout}
                onChange={(e) => setSettings({...settings, timeout: e.target.value})}
                className="border-[#efc349]/20 focus:border-[#efc349]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxRetries" className="text-[#020817] dark:text-white">
                Máximo de Tentativas
              </Label>
              <Input
                id="maxRetries"
                type="number"
                value={settings.maxRetries}
                onChange={(e) => setSettings({...settings, maxRetries: e.target.value})}
                className="border-[#efc349]/20 focus:border-[#efc349]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Configuration */}
      <Card className="bg-white/80 dark:bg-[#020817]/80 backdrop-blur-sm border-[#efc349]/20">
        <CardHeader>
          <CardTitle className="text-[#020817] dark:text-white flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Configuração de Sincronização
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Configure quando e como os documentos serão sincronizados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-[#020817] dark:text-white">
                Sincronização Automática
              </Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Executar sincronização automaticamente
              </p>
            </div>
            <Switch
              checked={settings.autoSync}
              onCheckedChange={(checked) => setSettings({...settings, autoSync: checked})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="syncInterval" className="text-[#020817] dark:text-white">
              Intervalo de Sincronização
            </Label>
            <Select value={settings.syncInterval} onValueChange={(value) => setSettings({...settings, syncInterval: value})}>
              <SelectTrigger className="border-[#efc349]/20 focus:border-[#efc349]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hora</SelectItem>
                <SelectItem value="6">6 horas</SelectItem>
                <SelectItem value="12">12 horas</SelectItem>
                <SelectItem value="24">24 horas</SelectItem>
                <SelectItem value="168">7 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="retentionDays" className="text-[#020817] dark:text-white">
              Retenção de Dados (dias)
            </Label>
            <Input
              id="retentionDays"
              type="number"
              value={settings.retentionDays}
              onChange={(e) => setSettings({...settings, retentionDays: e.target.value})}
              className="border-[#efc349]/20 focus:border-[#efc349]"
            />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Por quanto tempo manter os documentos armazenados
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-white/80 dark:bg-[#020817]/80 backdrop-blur-sm border-[#efc349]/20">
        <CardHeader>
          <CardTitle className="text-[#020817] dark:text-white flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Notificações
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Configure as notificações sobre sincronizações e erros
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-[#020817] dark:text-white">
                Habilitar Notificações
              </Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receber notificações sobre o status das sincronizações
              </p>
            </div>
            <Switch
              checked={settings.enableNotifications}
              onCheckedChange={(checked) => setSettings({...settings, enableNotifications: checked})}
            />
          </div>

          {settings.enableNotifications && (
            <div className="space-y-2">
              <Label htmlFor="notificationEmail" className="text-[#020817] dark:text-white">
                Email para Notificações
              </Label>
              <Input
                id="notificationEmail"
                type="email"
                placeholder="admin@exemplo.com"
                value={settings.notificationEmail}
                onChange={(e) => setSettings({...settings, notificationEmail: e.target.value})}
                className="border-[#efc349]/20 focus:border-[#efc349]"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs */}
      <Card className="bg-white/80 dark:bg-[#020817]/80 backdrop-blur-sm border-[#efc349]/20">
        <CardHeader>
          <CardTitle className="text-[#020817] dark:text-white flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Logs do Sistema
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Configure o nível de detalhamento dos logs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-[#020817] dark:text-white">
                Habilitar Logs
              </Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Registrar atividades do sistema
              </p>
            </div>
            <Switch
              checked={settings.enableLogs}
              onCheckedChange={(checked) => setSettings({...settings, enableLogs: checked})}
            />
          </div>

          {settings.enableLogs && (
            <div className="space-y-2">
              <Label htmlFor="logLevel" className="text-[#020817] dark:text-white">
                Nível de Log
              </Label>
              <Select value={settings.logLevel} onValueChange={(value) => setSettings({...settings, logLevel: value})}>
                <SelectTrigger className="border-[#efc349]/20 focus:border-[#efc349]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="error">Apenas Erros</SelectItem>
                  <SelectItem value="warn">Avisos e Erros</SelectItem>
                  <SelectItem value="info">Informações, Avisos e Erros</SelectItem>
                  <SelectItem value="debug">Debug (Tudo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          className="bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]"
        >
          <Save className="w-4 h-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
};

export default FiscalSettings;
