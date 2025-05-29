
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, AlertTriangle } from 'lucide-react';
import { ClientAnnouncement } from '@/types/client';
import { useClientData } from '@/hooks/client/useClientData';

export const AnnouncementsSection = () => {
  const { announcements, fetchAnnouncements } = useClientData();

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
      <CardHeader>
        <CardTitle className="flex items-center text-[#020817] dark:text-[#efc349] font-extralight text-xl">
          <Megaphone className="mr-2 h-5 w-5" />
          Comunicados Recebidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 font-extralight">
            Nenhum comunicado encontrado
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="p-4 rounded-lg border border-gray-200 dark:border-[#efc349]/30 bg-gray-50 dark:bg-[#0b1320]/50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {announcement.theme === 'urgent' && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                    <h3 className="font-extralight text-[#020817] dark:text-white">
                      {announcement.title}
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    {announcement.theme === 'urgent' && (
                      <Badge variant="destructive" className="text-xs font-extralight">
                        Urgente
                      </Badge>
                    )}
                    {isExpired(announcement.expires_at) && (
                      <Badge variant="secondary" className="text-xs font-extralight">
                        Expirado
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-extralight mb-2">
                  {announcement.message}
                </p>
                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-extralight">
                    Enviado em: {formatDate(announcement.created_at)}
                  </span>
                  {announcement.expires_at && (
                    <span className="font-extralight">
                      Expira em: {formatDate(announcement.expires_at)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
