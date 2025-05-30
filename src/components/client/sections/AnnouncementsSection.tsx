
import { useClientData } from "@/hooks/client/useClientData";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Megaphone, Clock, ExternalLink, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const AnnouncementsSection = () => {
  const { announcements, fetchAnnouncements, isLoading } = useClientData();

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#efc349]"></div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-[#efc349] to-[#d4a017] rounded-xl">
          <Megaphone className="w-5 h-5 text-[#0b1320]" />
        </div>
        <h2 className="text-2xl font-light text-[#020817] dark:text-[#efc349]">
          Comunicados
        </h2>
      </div>

      {announcements.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="border border-[#efc349]/20 bg-white/80 dark:bg-[#0b1320]/80 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Megaphone className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                Nenhum comunicado disponível
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-center">
                Comunicados importantes da contabilidade aparecerão aqui
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement, index) => (
            <motion.div key={announcement.id} variants={itemVariants}>
              <Card className="border border-[#efc349]/20 bg-white/80 dark:bg-[#0b1320]/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-medium text-[#020817] dark:text-[#efc349] mb-2">
                        {announcement.title}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            announcement.theme === 'urgent' ? 'border-red-500 text-red-600' :
                            announcement.theme === 'warning' ? 'border-yellow-500 text-yellow-600' :
                            'border-blue-500 text-blue-600'
                          }`}
                        >
                          {announcement.theme === 'urgent' && <AlertCircle className="w-3 h-3 mr-1" />}
                          {announcement.theme === 'urgent' ? 'Urgente' :
                           announcement.theme === 'warning' ? 'Atenção' : 'Informativo'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {announcement.message}
                  </p>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      {new Date(announcement.created_at).toLocaleString('pt-BR')}
                    </div>
                    
                    {announcement.action_button_text && announcement.action_button_url && (
                      <Button
                        size="sm"
                        className="bg-[#efc349] hover:bg-[#d4a017] text-[#0b1320]"
                        onClick={() => window.open(announcement.action_button_url, '_blank')}
                      >
                        {announcement.action_button_text}
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
