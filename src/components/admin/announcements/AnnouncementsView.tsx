
import { useState } from 'react';
import { Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { CreateAnnouncementDialog } from './CreateAnnouncementDialog';
import { EditAnnouncementDialog } from './EditAnnouncementDialog';
import { Announcement } from '@/types/announcements';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export const AnnouncementsView = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  
  const {
    announcements,
    deleteAnnouncement,
    updateAnnouncement,
    isLoading,
    isDeleting
  } = useAnnouncements();

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

  const toggleAnnouncementStatus = (announcement: Announcement) => {
    updateAnnouncement({
      id: announcement.id,
      data: { 
        title: announcement.title,
        message: announcement.message,
        target_type: announcement.target_type,
        target_user_id: announcement.target_user_id,
        theme: announcement.theme,
        position: announcement.position,
        action_button_text: announcement.action_button_text,
        action_button_url: announcement.action_button_url,
        is_active: !announcement.is_active,
        expires_at: announcement.expires_at ? new Date(announcement.expires_at) : null
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#efc349]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight text-gray-900 dark:text-white">
            Gerenciar Anúncios
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Crie e gerencie pop-ups informativos para usuários e visitantes
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-[#efc349] hover:bg-[#efc349]/80 text-black font-extralight"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Anúncio
        </Button>
      </div>

      <div className="grid gap-4">
        {announcements.length === 0 ? (
          <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
            <CardContent className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 font-extralight">
                Nenhum anúncio criado ainda.
              </p>
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement.id} className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAnnouncementStatus(announcement)}
                      className="text-gray-600 dark:text-gray-300 hover:text-[#efc349]"
                    >
                      {announcement.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingAnnouncement(announcement)}
                      className="text-gray-600 dark:text-gray-300 hover:text-[#efc349]"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-gray-900 dark:text-white font-extralight">
                            Confirmar exclusão
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
                            Tem certeza que deseja excluir este anúncio? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="font-extralight">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteAnnouncement(announcement.id)}
                            className="bg-red-600 hover:bg-red-700 text-white font-extralight"
                            disabled={isDeleting}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
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
          ))
        )}
      </div>

      <CreateAnnouncementDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog} 
      />
      
      {editingAnnouncement && (
        <EditAnnouncementDialog 
          announcement={editingAnnouncement}
          open={!!editingAnnouncement} 
          onOpenChange={(open) => !open && setEditingAnnouncement(null)} 
        />
      )}
    </div>
  );
};
