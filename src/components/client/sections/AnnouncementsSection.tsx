
import { useClientData } from "@/hooks/client/useClientData";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Megaphone, Calendar, ExternalLink } from "lucide-react";
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
        <div className="p-3 bg-gradient-to-r from-[#efc349] to-[#d4a017] rounded-xl">
          <Megaphone className="w-6 h-6 text-[#0b1320]" />
        </div>
        <h2 className="text-2xl font-light text-[#efc349] tracking-wide">
          COMUNICADOS
        </h2>
      </div>

      {announcements.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="border border-[#efc349]/20 bg-[#1a2633]/80 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Megaphone className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                Nenhum comunicado encontrado
              </h3>
              <p className="text-gray-400 text-center">
                Comunicados importantes da contabilidade aparecerão aqui
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {announcements.map((announcement, index) => (
            <motion.div key={announcement.id} variants={itemVariants}>
              <Card className="border border-[#efc349]/20 bg-[#1a2633]/80 backdrop-blur-sm hover:shadow-lg hover:border-[#efc349]/40 transition-all duration-300">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl font-medium text-[#efc349] flex-1">
                      {announcement.title}
                    </CardTitle>
                    <Badge 
                      variant="outline" 
                      className={`text-xs border-gray-500 text-gray-300 ${
                        announcement.theme === 'urgent' ? 'border-red-500 text-red-400' :
                        announcement.theme === 'warning' ? 'border-yellow-500 text-yellow-400' :
                        'border-blue-500 text-blue-400'
                      }`}
                    >
                      {announcement.theme === 'urgent' ? 'Urgente' :
                       announcement.theme === 'warning' ? 'Atenção' : 'Informativo'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(announcement.created_at).toLocaleDateString('pt-BR')}</span>
                    {announcement.expires_at && (
                      <span className="text-yellow-400">
                        • Expira em {new Date(announcement.expires_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-200 leading-relaxed">
                    {announcement.message}
                  </p>
                  
                  {announcement.action_button_text && announcement.action_button_url && (
                    <Button 
                      variant="outline" 
                      className="border-[#efc349] text-[#efc349] hover:bg-[#efc349] hover:text-[#0b1320]"
                      onClick={() => window.open(announcement.action_button_url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {announcement.action_button_text}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
