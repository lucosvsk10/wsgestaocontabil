
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Announcement } from '@/types/announcements';
import { AnnouncementActions } from './AnnouncementActions';

interface AnnouncementCardProps {
  announcement: Announcement;
  onToggleStatus: (announcement: Announcement) => void;
  onEdit: (announcement: Announcement) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export const AnnouncementCard = ({
  announcement,
  onToggleStatus,
  onEdit,
  onDelete,
  isDeleting
}: AnnouncementCardProps) => {
  const getStatusBadge = (announcement: Announcement) => {
    if (!announcement.is_active) {
      return <Badge variant="secondary">Desativado</Badge>;
    }
    
    if (announcement.expires_at && new Date(announcement.expires_at) < new Date()) {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    
    return <Badge variant="default" className="bg-[#efc349] text-black">Ativo</Badge>;
  };

  const getTargetTypeLabel = (targetType: string) => {
    const labels = {
      'all_users': 'Todos os usuários',
      'logged_users': 'Usuários logados',
      'public_visitors': 'Visitantes públicos',
      'specific_user': 'Usuário específico'
    };
    return labels[targetType as keyof typeof labels] || targetType;
  };

  return (
    <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-extralight text-gray-900 dark:text-white">
              {announcement.title}
            </CardTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge(announcement)}
              <Badge variant="outline" className="text-xs">
                {announcement.theme === 'urgent' ? 'Urgente' : 'Normal'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {announcement.position === 'top_fixed' ? 'Topo' : 'Inferior direita'}
              </Badge>
            </div>
          </div>
          <AnnouncementActions
            announcement={announcement}
            onToggleStatus={onToggleStatus}
            onEdit={onEdit}
            onDelete={onDelete}
            isDeleting={isDeleting}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300 font-extralight">
          {announcement.message}
        </p>
        
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div>
            <span className="font-extralight">Público-alvo:</span>
            <p className="font-extralight">{getTargetTypeLabel(announcement.target_type)}</p>
          </div>
          <div>
            <span className="font-extralight">Criado em:</span>
            <p className="font-extralight">{new Date(announcement.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
          {announcement.expires_at && (
            <div>
              <span className="font-extralight">Expira em:</span>
              <p className="font-extralight">{new Date(announcement.expires_at).toLocaleDateString('pt-BR')}</p>
            </div>
          )}
          {announcement.action_button_text && (
            <div>
              <span className="font-extralight">Ação:</span>
              <p className="font-extralight">{announcement.action_button_text}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
