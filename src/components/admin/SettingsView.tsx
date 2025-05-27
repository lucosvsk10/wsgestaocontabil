
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Database, Shield, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const SettingsView = () => {
  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extralight text-[#020817] dark:text-[#efc349] mb-2">
            Configurações do Sistema
          </h1>
          <p className="text-gray-600 dark:text-[#b3b3b3]">
            Gerencie as configurações gerais do sistema
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
          <CardHeader>
            <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349] flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications" className="text-[#020817] dark:text-[#f4f4f4]">
                Notificações por email
              </Label>
              <Switch id="notifications" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-backup" className="text-[#020817] dark:text-[#f4f4f4]">
                Backup automático
              </Label>
              <Switch id="auto-backup" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
          <CardHeader>
            <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349] flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full bg-transparent border border-[#efc349] text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight">
              Alterar Senha Master
            </Button>
            <Button className="w-full bg-transparent border border-[#efc349] text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight">
              Configurar 2FA
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
          <CardHeader>
            <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349] flex items-center gap-2">
              <Database className="h-5 w-5" />
              Banco de Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full bg-transparent border border-[#efc349] text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight">
              Fazer Backup
            </Button>
            <Button className="w-full bg-transparent border border-[#efc349] text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight">
              Limpar Cache
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
          <CardHeader>
            <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349] flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-alerts" className="text-[#020817] dark:text-[#f4f4f4]">
                Alertas por email
              </Label>
              <Switch id="email-alerts" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sms-alerts" className="text-[#020817] dark:text-[#f4f4f4]">
                Alertas por SMS
              </Label>
              <Switch id="sms-alerts" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
