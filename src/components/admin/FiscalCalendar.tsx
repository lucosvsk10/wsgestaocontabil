
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Edit, Trash2, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface FiscalEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  category: string;
  status: string;
  created_by?: string;
  created_at: string;
}

export const FiscalCalendar: React.FC = () => {
  const [events, setEvents] = useState<FiscalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FiscalEvent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    category: 'fiscal',
    status: 'upcoming'
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('fiscal_events')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      setEvents(data || []);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os eventos.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createEvent = async () => {
    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from('fiscal_events')
        .insert([newEvent])
        .select();
      
      if (error) throw error;
      
      if (data) {
        setEvents(prev => [...prev, ...data]);
        setNewEvent({
          title: '',
          description: '',
          date: '',
          category: 'fiscal',
          status: 'upcoming'
        });
        setIsCreateDialogOpen(false);
        toast({
          title: "Sucesso",
          description: "Evento criado com sucesso!"
        });
      }
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o evento.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateEvent = async () => {
    if (!editingEvent) return;
    
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('fiscal_events')
        .update({
          title: editingEvent.title,
          description: editingEvent.description,
          date: editingEvent.date,
          category: editingEvent.category,
          status: editingEvent.status
        })
        .eq('id', editingEvent.id);
      
      if (error) throw error;
      
      setEvents(prev => prev.map(event => 
        event.id === editingEvent.id ? editingEvent : event
      ));
      setIsEditDialogOpen(false);
      setEditingEvent(null);
      toast({
        title: "Sucesso",
        description: "Evento atualizado com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o evento.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return;
    
    try {
      const { error } = await supabase
        .from('fiscal_events')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setEvents(prev => prev.filter(event => event.id !== id));
      toast({
        title: "Sucesso",
        description: "Evento excluído com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o evento.",
        variant: "destructive"
      });
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'fiscal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'contabil': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'trabalhista': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'upcoming': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return 'Data inválida';
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch (error) {
      return 'Data inválida';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Calendar className="h-12 w-12 text-[#efc349] mx-auto mb-4 animate-pulse" />
          <p className="text-[#020817] dark:text-white font-extralight">Carregando agenda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-[#fdfdfd] dark:bg-[#020817] min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl text-[#020817] dark:text-[#efc349] mb-4 font-extralight">
            Agenda Fiscal
          </h1>
          <p className="text-gray-600 dark:text-white/70 font-extralight">
            Gerencie eventos fiscais, contábeis e trabalhistas
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#020817] hover:bg-[#0f172a] text-white dark:bg-transparent dark:border dark:border-[#efc349] dark:text-[#efc349] dark:hover:bg-[#efc349]/10 font-extralight">
              <Plus className="h-4 w-4 mr-2" />
              Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-[#0b0f1c] border-gray-200 dark:border-[#efc349]/30">
            <DialogHeader>
              <DialogTitle className="text-xl font-extralight text-[#020817] dark:text-[#efc349]">
                Criar Novo Evento
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-white/70 font-extralight">
                Adicione um novo evento à agenda fiscal
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-[#020817] dark:text-white font-extralight">Título</Label>
                <Input
                  id="title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({...prev, title: e.target.value}))}
                  placeholder="Digite o título do evento"
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-[#020817] dark:text-white font-extralight">Descrição</Label>
                <Textarea
                  id="description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({...prev, description: e.target.value}))}
                  placeholder="Descrição opcional do evento"
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-[#020817] dark:text-white font-extralight">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent(prev => ({...prev, date: e.target.value}))}
                    className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[#020817] dark:text-white font-extralight">Categoria</Label>
                  <Select value={newEvent.category} onValueChange={(value) => setNewEvent(prev => ({...prev, category: value}))}>
                    <SelectTrigger className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#0b0f1c] border-gray-200 dark:border-[#efc349]/30">
                      <SelectItem value="fiscal">Fiscal</SelectItem>
                      <SelectItem value="contabil">Contábil</SelectItem>
                      <SelectItem value="trabalhista">Trabalhista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[#020817] dark:text-white font-extralight">Status</Label>
                  <Select value={newEvent.status} onValueChange={(value) => setNewEvent(prev => ({...prev, status: value}))}>
                    <SelectTrigger className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#0b0f1c] border-gray-200 dark:border-[#efc349]/30">
                      <SelectItem value="upcoming">Pendente</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="overdue">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="border-gray-200 dark:border-[#efc349]/30 hover:bg-gray-50 dark:hover:bg-[#efc349]/10 font-extralight"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={createEvent} 
                  disabled={isSaving || !newEvent.title || !newEvent.date}
                  className="bg-[#020817] hover:bg-[#0f172a] text-white dark:bg-transparent dark:border dark:border-[#efc349] dark:text-[#efc349] dark:hover:bg-[#efc349]/10 font-extralight"
                >
                  {isSaving ? <LoadingSpinner /> : 'Criar Evento'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {events.length === 0 ? (
          <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 dark:text-white/40 mb-4" />
              <h3 className="text-lg font-extralight text-[#020817] dark:text-white mb-2">
                Nenhum evento cadastrado
              </h3>
              <p className="text-gray-600 dark:text-white/70 text-center font-extralight">
                Crie seu primeiro evento fiscal para começar a organizar sua agenda.
              </p>
            </CardContent>
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.id} className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 hover:shadow-lg dark:hover:shadow-none transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-extralight text-[#020817] dark:text-white">
                        {event.title}
                      </h3>
                      <Badge className={`${getCategoryColor(event.category)} font-extralight`}>
                        {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                      </Badge>
                      <Badge className={`${getStatusColor(event.status)} font-extralight`}>
                        {event.status === 'upcoming' ? 'Pendente' : 
                         event.status === 'completed' ? 'Concluído' : 'Atrasado'}
                      </Badge>
                    </div>
                    
                    {event.description && (
                      <p className="text-gray-600 dark:text-white/70 mb-2 font-extralight">
                        {event.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-white/60">
                      <Clock className="h-4 w-4" />
                      <span className="font-extralight">{formatDate(event.date)}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-200 dark:border-[#efc349]/30 hover:bg-gray-50 dark:hover:bg-[#efc349]/10 font-extralight"
                      onClick={() => {
                        setEditingEvent(event);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 dark:border-red-400/30 hover:bg-red-50 dark:hover:bg-red-400/10 text-red-600 dark:text-red-400 font-extralight"
                      onClick={() => deleteEvent(event.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#0b0f1c] border-gray-200 dark:border-[#efc349]/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-extralight text-[#020817] dark:text-[#efc349]">
              Editar Evento
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-white/70 font-extralight">
              Modifique as informações do evento
            </DialogDescription>
          </DialogHeader>
          
          {editingEvent && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-[#020817] dark:text-white font-extralight">Título</Label>
                <Input
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent(prev => prev ? {...prev, title: e.target.value} : null)}
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-[#020817] dark:text-white font-extralight">Descrição</Label>
                <Textarea
                  value={editingEvent.description || ''}
                  onChange={(e) => setEditingEvent(prev => prev ? {...prev, description: e.target.value} : null)}
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#020817] dark:text-white font-extralight">Data</Label>
                  <Input
                    type="date"
                    value={editingEvent.date}
                    onChange={(e) => setEditingEvent(prev => prev ? {...prev, date: e.target.value} : null)}
                    className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[#020817] dark:text-white font-extralight">Categoria</Label>
                  <Select 
                    value={editingEvent.category} 
                    onValueChange={(value) => setEditingEvent(prev => prev ? {...prev, category: value} : null)}
                  >
                    <SelectTrigger className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#0b0f1c] border-gray-200 dark:border-[#efc349]/30">
                      <SelectItem value="fiscal">Fiscal</SelectItem>
                      <SelectItem value="contabil">Contábil</SelectItem>
                      <SelectItem value="trabalhista">Trabalhista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[#020817] dark:text-white font-extralight">Status</Label>
                  <Select 
                    value={editingEvent.status} 
                    onValueChange={(value) => setEditingEvent(prev => prev ? {...prev, status: value} : null)}
                  >
                    <SelectTrigger className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#0b0f1c] border-gray-200 dark:border-[#efc349]/30">
                      <SelectItem value="upcoming">Pendente</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="overdue">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="border-gray-200 dark:border-[#efc349]/30 hover:bg-gray-50 dark:hover:bg-[#efc349]/10 font-extralight"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={updateEvent} 
                  disabled={isSaving}
                  className="bg-[#020817] hover:bg-[#0f172a] text-white dark:bg-transparent dark:border dark:border-[#efc349] dark:text-[#efc349] dark:hover:bg-[#efc349]/10 font-extralight"
                >
                  {isSaving ? <LoadingSpinner /> : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
