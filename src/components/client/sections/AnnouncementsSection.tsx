import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, ExternalLink } from "lucide-react";
import { ClientAnnouncement } from "@/types/client";
import { supabase } from "@/integrations/supabase/client";

export const AnnouncementsSection = () => {
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

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="text-center mb-10">
          <div className="w-12 h-12 mx-auto rounded-full bg-muted animate-pulse mb-4" />
          <div className="h-6 w-32 mx-auto bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto py-8 px-4"
    >
      {/* Header minimalista */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-2xl font-light text-foreground mb-1">
          Comunicados
        </h1>
        <p className="text-sm text-muted-foreground font-light">
          Avisos importantes do escritório
        </p>
      </div>

      {/* Contagem */}
      <p className="text-xs text-muted-foreground mb-4">
        {announcements.length} comunicado{announcements.length !== 1 ? 's' : ''}
      </p>

      {announcements.length === 0 ? (
        <div className="bg-card rounded-xl p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">
            Nenhum comunicado disponível
          </h3>
          <p className="text-xs text-muted-foreground">
            Quando houver novos comunicados, eles aparecerão aqui
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl overflow-hidden">
          <div className="divide-y divide-border/50">
            {announcements.map((announcement, index) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="group py-4 px-5 transition-all duration-200 hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bell className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-foreground mb-1">
                        {announcement.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {announcement.message}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(announcement.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  {announcement.action_button_text && announcement.action_button_url && (
                    <button 
                      onClick={() => window.open(announcement.action_button_url, '_blank')}
                      className="flex-shrink-0 p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-200 opacity-0 group-hover:opacity-100"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
