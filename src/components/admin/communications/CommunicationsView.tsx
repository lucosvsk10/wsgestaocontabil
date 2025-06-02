
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Edit, Trash2, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface ClientAnnouncement {
  id: string;
  title: string;
  message: string;
  theme: string;
  action_button_text?: string;
  action_button_url?: string;
  expires_at?: string;
  created_at: string;
}

export const CommunicationsView = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: communications = [], isLoading } = useQuery({
    queryKey: ['client-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ClientAnnouncement[];
    }
  });

  const deleteCommunicationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('client_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-announcements'] });
      toast({
        title: 'Sucesso',
        description: 'Comunicado excluído com sucesso!'
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir comunicado: ' + error.message,
        variant: 'destructive'
      });
    }
  });

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

  const getThemeBadge = (theme: string) => {
    switch (theme) {
      case 'info':
        return <Badge variant="outline" className="font-extralight text-blue-600">Info</Badge>;
      case 'warning':
        return <Badge variant="destructive" className="font-extralight">Aviso</Badge>;
      case 'success':
        return <Badge variant="secondary" className="font-extralight text-green-600">Sucesso</Badge>;
      case 'danger':
        return <Badge variant="destructive" className="font-extralight">Perigo</Badge>;
      default:
        return <Badge variant="outline" className="font-extralight">Normal</Badge>;
    }
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
            Gerenciar Comunicados
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Crie e gerencie comunicados que aparecerão para os clientes
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-[#efc349] hover:bg-[#efc349]/80 text-black font-extralight"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Comunicado
        </Button>
      </div>

      <div className="grid gap-4">
        {communications.length === 0 ? (
          <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
            <CardContent className="text-center py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
              <p className="text-gray-500 dark:text-gray-400 font-extralight">
                Nenhum comunicado criado ainda.
              </p>
            </CardContent>
          </Card>
        ) : (
          communications.map((communication) => (
            <Card key={communication.id} className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-extralight text-gray-900 dark:text-white">
                      {communication.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {getThemeBadge(communication.theme)}
                      {isExpired(communication.expires_at) && (
                        <Badge variant="secondary" className="font-extralight">Expirado</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 dark:text-gray-300 hover:text-[#efc349]"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCommunicationMutation.mutate(communication.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300 font-extralight">
                  {communication.message}
                </p>
                
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <div>
                    <span className="font-extralight">Criado em:</span>
                    <p className="font-extralight">{formatDate(communication.created_at)}</p>
                  </div>
                  {communication.expires_at && (
                    <div>
                      <span className="font-extralight">Expira em:</span>
                      <p className="font-extralight">{formatDate(communication.expires_at)}</p>
                    </div>
                  )}
                  {communication.action_button_text && (
                    <div>
                      <span className="font-extralight">Ação:</span>
                      <p className="font-extralight">{communication.action_button_text}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
