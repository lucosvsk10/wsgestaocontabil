
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, AlertCircle, CheckCircle, Info } from "lucide-react";
import { formatDate } from "@/utils/documentUtils";

export const AnnouncementsSection = () => {
  // Mock data para comunicados
  const announcements = [
    {
      id: "1",
      title: "Alterações no Simples Nacional 2024",
      message: "Importantes mudanças nas alíquotas do Simples Nacional entraram em vigor. Consulte nossa equipe para mais informações sobre como isso afeta sua empresa.",
      created_at: "2024-01-15T10:00:00Z",
      expires_at: "2024-02-15T23:59:59Z",
      theme: "info",
      priority: "high"
    },
    {
      id: "2", 
      title: "Prazo para DEFIS 2024",
      message: "Lembrete: O prazo para entrega da DEFIS é até 31 de janeiro. Nossa equipe está à disposição para auxiliar no processo.",
      created_at: "2024-01-10T08:00:00Z",
      expires_at: "2024-01-31T23:59:59Z",
      theme: "warning",
      priority: "urgent"
    },
    {
      id: "3",
      title: "Novos Serviços Disponíveis",
      message: "Agora oferecemos consultoria em planejamento tributário e análise de viabilidade econômica. Agende uma conversa conosco!",
      created_at: "2024-01-05T14:00:00Z",
      expires_at: null,
      theme: "success",
      priority: "normal"
    }
  ];

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case "warning":
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "info":
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getThemeColors = (theme: string) => {
    switch (theme) {
      case "warning":
        return {
          bg: "bg-orange-50 dark:bg-orange-900/20",
          border: "border-orange-200 dark:border-orange-700/30",
          badge: "bg-orange-100 text-orange-800 dark:bg-orange-800/20 dark:text-orange-300"
        };
      case "success":
        return {
          bg: "bg-green-50 dark:bg-green-900/20",
          border: "border-green-200 dark:border-green-700/30",
          badge: "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300"
        };
      case "info":
      default:
        return {
          bg: "bg-blue-50 dark:bg-blue-900/20",
          border: "border-blue-200 dark:border-blue-700/30",
          badge: "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-300"
        };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-300">Urgente</Badge>;
      case "high":
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-800/20 dark:text-orange-300">Alta</Badge>;
      case "normal":
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-300">Normal</Badge>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header da seção */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#efc349]/10 dark:bg-[#efc349]/20 rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 text-[#efc349]" />
          </div>
          <div>
            <h2 className="text-2xl font-extralight text-[#020817] dark:text-white">
              Comunicados
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-extralight">
              {announcements.length} comunicados ativos
            </p>
          </div>
        </div>
      </div>

      {/* Lista de comunicados */}
      <div className="space-y-4">
        {announcements.map((announcement, index) => {
          const themeColors = getThemeColors(announcement.theme);
          
          return (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className={`${themeColors.bg} ${themeColors.border} hover:shadow-lg transition-all duration-300`}>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      {getThemeIcon(announcement.theme)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-medium text-[#020817] dark:text-white">
                          {announcement.title}
                        </h3>
                        {getPriorityBadge(announcement.priority)}
                      </div>
                      
                      <p className="text-gray-700 dark:text-gray-300 font-extralight mb-4">
                        {announcement.message}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-gray-500 dark:text-gray-400">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span className="font-extralight">
                            Publicado em {formatDate(announcement.created_at)}
                          </span>
                        </div>
                        
                        {announcement.expires_at && (
                          <div className="flex items-center text-gray-500 dark:text-gray-400">
                            <span className="font-extralight">
                              Expira em {formatDate(announcement.expires_at)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Comunicados arquivados */}
      <Card className="bg-white dark:bg-[#0b1320] border-[#e6e6e6] dark:border-[#efc349]/20">
        <CardHeader>
          <CardTitle className="flex items-center text-[#020817] dark:text-white font-extralight">
            <Bell className="w-5 h-5 mr-2 text-[#efc349]" />
            Comunicados Arquivados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-extralight">Nenhum comunicado arquivado</p>
            <p className="text-sm mt-2 font-extralight">
              Comunicados expirados aparecerão aqui
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
