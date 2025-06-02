
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, ExternalLink, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ClientAnnouncement } from "@/types/client";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const AnnouncementsSection = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<ClientAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('client_announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filtrar anúncios não expirados
      const activeAnnouncements = (data || []).filter(announcement => 
        !announcement.expires_at || new Date(announcement.expires_at) > new Date()
      );
      
      setAnnouncements(activeAnnouncements);
    } catch (error) {
      console.error('Erro ao buscar comunicados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getThemeColor = (theme: string) => {
    switch (theme) {
      case 'info': return 'bg-blue-600 hover:bg-blue-700';
      case 'warning': return 'bg-yellow-600 hover:bg-yellow-700';
      case 'error': return 'bg-red-600 hover:bg-red-700';
      case 'success': return 'bg-green-600 hover:bg-green-700';
      default: return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  if (loading) {
    return (
      <Card className="bg-[#0b1320] border-[#efc349]/20">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-[#020817] rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#0b1320] border-[#efc349]/20">
      <CardHeader>
        <CardTitle className="text-[#efc349] font-extralight flex items-center">
          <Bell className="w-6 h-6 mr-2" />
          Comunicados
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {announcements.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-extralight">Nenhum comunicado disponível</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement, index) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-[#020817] border border-[#efc349]/20 rounded-lg p-4 hover:border-[#efc349]/40 transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-white text-lg">
                    {announcement.title}
                  </h3>
                  <Badge className={getThemeColor(announcement.theme)}>
                    {announcement.theme}
                  </Badge>
                </div>

                <p className="text-gray-300 font-extralight mb-4">
                  {announcement.message}
                </p>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">
                    {new Date(announcement.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  
                  {announcement.action_button_text && announcement.action_button_url && (
                    <Button 
                      size="sm"
                      className="bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]"
                      onClick={() => window.open(announcement.action_button_url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      {announcement.action_button_text}
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
