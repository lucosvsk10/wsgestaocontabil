
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Edit, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface FiscalEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  status: string;
  created_at: string;
}

export const AgendaView = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['fiscal-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fiscal_events')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      return data as FiscalEvent[];
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fiscal_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-events'] });
      toast({
        title: 'Sucesso',
        description: 'Evento fiscal excluído com sucesso!'
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir evento: ' + error.message,
        variant: 'destructive'
      });
    }
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge variant="outline" className="font-extralight text-blue-600">Próximo</Badge>;
      case 'today':
        return <Badge variant="destructive" className="font-extralight">Hoje</Badge>;
      case 'overdue':
        return <Badge variant="destructive" className="font-extralight">Atrasado</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="font-extralight text-green-600">Concluído</Badge>;
      default:
        return <Badge variant="outline" className="font-extralight">Pendente</Badge>;
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
            Gerenciar Agenda Fiscal
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Crie e gerencie eventos que aparecerão na agenda dos clientes
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-[#efc349] hover:bg-[#efc349]/80 text-black font-extralight"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Evento
        </Button>
      </div>

      <div className="grid gap-4">
        {events.length === 0 ? (
          <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
            <CardContent className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
              <p className="text-gray-500 dark:text-gray-400 font-extralight">
                Nenhum evento fiscal criado ainda.
              </p>
            </CardContent>
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.id} className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-extralight text-gray-900 dark:text-white">
                      {event.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(event.status)}
                      <Badge variant="outline" className="text-xs font-extralight">
                        {event.category}
                      </Badge>
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
                      onClick={() => deleteEventMutation.mutate(event.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300 font-extralight">
                  {event.description}
                </p>
                
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-extralight">Data do evento:</span>
                  <p className="font-extralight">{formatDate(event.date)}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
