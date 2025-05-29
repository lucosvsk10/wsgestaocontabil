
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Megaphone, ExternalLink, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/hooks/client/useClientData';
import { Badge } from '@/components/ui/badge';

export const AnnouncementsSection = () => {
  const { user } = useAuth();
  const { announcements, fetchAnnouncements } = useClientData();

  useEffect(() => {
    if (user?.id) {
      fetchAnnouncements();
    }
  }, [user?.id, fetchAnnouncements]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getThemeColors = (theme: string) => {
    switch (theme) {
      case 'info':
        return 'border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-900/20';
      case 'warning':
        return 'border-yellow-200 dark:border-yellow-500/30 bg-yellow-50 dark:bg-yellow-900/20';
      case 'success':
        return 'border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-900/20';
      case 'danger':
        return 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-900/20';
      default:
        return 'border-[#e6e6e6] dark:border-[#efc349]/30 bg-white dark:bg-transparent';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extralight text-[#020817] dark:text-[#efc349]">
          Comunicados
        </h2>
        <Badge variant="outline" className="font-extralight">
          {announcements.length} {announcements.length === 1 ? 'comunicado' : 'comunicados'}
        </Badge>
      </div>

      {announcements.length === 0 ? (
        <Card className="border border-[#e6e6e6] dark:border-[#efc349]/30 bg-white dark:bg-transparent">
          <CardContent className="py-12 text-center">
            <Megaphone className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <p className="text-gray-600 dark:text-gray-400 font-extralight mb-2">
              Nenhum comunicado disponível
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 font-extralight">
              Comunicados importantes aparecerão aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card 
              key={announcement.id} 
              className={`border ${getThemeColors(announcement.theme)} transition-all hover:shadow-md`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#efc349]/10">
                      <Megaphone className="w-5 h-5 text-[#efc349]" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349]">
                        {announcement.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-extralight">
                          {formatDate(announcement.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  {isExpired(announcement.expires_at) && (
                    <Badge variant="secondary" className="font-extralight">
                      Expirado
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-[#020817] dark:text-white font-extralight leading-relaxed">
                  {announcement.message}
                </p>

                {announcement.expires_at && !isExpired(announcement.expires_at) && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-extralight">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Válido até: {formatDate(announcement.expires_at)}
                  </div>
                )}

                {announcement.action_button_text && announcement.action_button_url && (
                  <Button 
                    className="bg-transparent border border-[#efc349] text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight"
                    onClick={() => window.open(announcement.action_button_url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {announcement.action_button_text}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
