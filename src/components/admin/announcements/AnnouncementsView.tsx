
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Announcement } from '@/types/announcements';
import { CreateAnnouncementDialog } from './CreateAnnouncementDialog';
import { EditAnnouncementDialog } from './EditAnnouncementDialog';
import { toast } from 'sonner';

export const AnnouncementsView: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Erro ao carregar anúncios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(currentStatus ? 'Anúncio desativado' : 'Anúncio ativado');
      fetchAnnouncements();
    } catch (error) {
      console.error('Error toggling announcement:', error);
      toast.error('Erro ao alterar status do anúncio');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este anúncio?')) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Anúncio excluído com sucesso');
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Erro ao excluir anúncio');
    }
  };

  const getTargetTypeLabel = (targetType: string, targetUserId?: string) => {
    switch (targetType) {
      case 'all_users': return 'Todos os usuários';
      case 'logged_users': return 'Usuários logados';
      case 'public_visitors': return 'Visitantes públicos';
      case 'specific_user': return `Usuário específico (${targetUserId?.slice(0, 8)}...)`;
      default: return targetType;
    }
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#efc349]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl text-[#020817] dark:text-[#efc349] mb-4 font-extralight">
            Gerenciar Anúncios
          </h1>
          <p className="text-gray-600 dark:text-white/70 font-extralight">
            Crie e gerencie pop-ups informativos para seus usuários
          </p>
        </div>
        <Button 
          onClick={() => setCreateDialogOpen(true)}
          className="font-extralight"
        >
          <Plus size={16} className="mr-2" />
          Novo Anúncio
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {announcements.length === 0 ? (
          <Card className="p-12 text-center">
            <CardContent>
              <p className="text-gray-500 dark:text-white/70 font-extralight">
                Nenhum anúncio criado ainda
              </p>
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement.id} className="p-6">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <CardTitle className="text-xl font-extralight">
                      {announcement.title}
                    </CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      <Badge 
                        variant={announcement.is_active ? "default" : "secondary"}
                        className="font-extralight"
                      >
                        {announcement.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      {isExpired(announcement.expires_at) && (
                        <Badge variant="destructive" className="font-extralight">
                          Expirado
                        </Badge>
                      )}
                      <Badge 
                        variant={announcement.theme === 'urgent' ? "destructive" : "outline"}
                        className="font-extralight"
                      >
                        {announcement.theme === 'urgent' ? 'Urgente' : 'Normal'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(announcement.id, announcement.is_active)}
                      className="font-extralight"
                    >
                      {announcement.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedAnnouncement(announcement);
                        setEditDialogOpen(true);
                      }}
                      className="font-extralight"
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(announcement.id)}
                      className="text-red-500 hover:text-red-700 font-extralight"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-white/70 mb-4 font-extralight">
                  {announcement.message}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-extralight text-gray-500 dark:text-white/50">Público:</span>
                    <br />
                    <span className="font-extralight">{getTargetTypeLabel(announcement.target_type, announcement.target_user_id)}</span>
                  </div>
                  <div>
                    <span className="font-extralight text-gray-500 dark:text-white/50">Posição:</span>
                    <br />
                    <span className="font-extralight">
                      {announcement.position === 'bottom_right' ? 'Canto inferior direito' : 'Topo fixo'}
                    </span>
                  </div>
                  <div>
                    <span className="font-extralight text-gray-500 dark:text-white/50">Expira em:</span>
                    <br />
                    <span className="font-extralight">
                      {announcement.expires_at 
                        ? new Date(announcement.expires_at).toLocaleString('pt-BR')
                        : 'Nunca'
                      }
                    </span>
                  </div>
                </div>
                {announcement.action_button_text && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="font-extralight text-sm text-gray-500 dark:text-white/50">Botão de ação:</span>
                    <br />
                    <span className="font-extralight">{announcement.action_button_text}</span>
                    {announcement.action_button_url && (
                      <span className="font-extralight text-xs text-gray-400 ml-2">
                        → {announcement.action_button_url}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <CreateAnnouncementDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchAnnouncements}
      />

      {selectedAnnouncement && (
        <EditAnnouncementDialog 
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          announcement={selectedAnnouncement}
          onSuccess={fetchAnnouncements}
        />
      )}
    </div>
  );
};
