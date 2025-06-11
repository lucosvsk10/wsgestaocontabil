
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, ExternalLink, X, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { ClientAnnouncement } from '@/types/client';

export const ClientAnnouncementsContainer = () => {
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
        .eq('is_active', true)
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
      <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/20 shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-gray-100 dark:bg-[#020817] rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/20 shadow-sm">
      <CardHeader className="bg-white dark:bg-[#0b1320] border-b border-gray-200 dark:border-[#efc349]/20">
        <CardTitle className="text-[#020817] dark:text-[#efc349] font-semibold flex items-center text-2xl">
          <Bell className="w-6 h-6 mr-3" />
          Comunicados para Clientes
          <Badge variant="outline" className="ml-3 border-gray-300 dark:border-[#efc349]/30 text-[#020817] dark:text-[#efc349] font-normal">
            {announcements.length} comunicado{announcements.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="bg-white dark:bg-[#0b1320] p-6">
        {announcements.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-[#020817] rounded-full flex items-center justify-center">
              <Bell className="w-8 h-8 text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-[#020817] dark:text-white mb-2">
              Nenhum comunicado ativo
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Quando houver comunicados ativos para clientes, eles aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement, index) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-white dark:bg-[#020817] border border-[#efc349]/30 dark:border-[#efc349]/20 rounded-xl overflow-hidden hover:border-[#efc349]/50 dark:hover:border-[#efc349]/40 hover:shadow-md transition-all duration-300 max-h-[250px] flex flex-col"
              >
                {/* Header fixo */}
                <div className="p-6 pb-4 flex-shrink-0">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-[#020817] dark:text-white text-lg break-words overflow-wrap-break-word">
                      {announcement.title}
                    </h3>
                    <Badge className={`${getThemeColor(announcement.theme)} text-white font-medium flex-shrink-0 ml-2`}>
                      {announcement.theme}
                    </Badge>
                  </div>
                </div>

                {/* Conteúdo com scroll */}
                <div className="px-6 flex-1 overflow-y-auto">
                  <div className="mb-4">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed break-words overflow-wrap-break-word word-break-break-word whitespace-normal">
                      {announcement.message}
                    </p>
                  </div>
                </div>

                {/* Footer fixo */}
                <div className="p-6 pt-0 flex-shrink-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(announcement.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    
                    {announcement.action_button_text && announcement.action_button_url && (
                      <Button 
                        size="sm"
                        className="bg-[#efc349] hover:bg-[#d4a843] text-[#020817] font-medium transition-all duration-300 flex-shrink-0"
                        onClick={() => window.open(announcement.action_button_url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {announcement.action_button_text}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
