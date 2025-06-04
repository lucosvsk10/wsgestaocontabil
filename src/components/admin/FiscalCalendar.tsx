
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, CalendarDays, Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface FiscalEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  status: string;
  category: string;
  created_at: string;
  created_by?: string;
}

export const FiscalCalendar = () => {
  const [events, setEvents] = useState<FiscalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FiscalEvent | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    status: "upcoming",
    category: "fiscal"
  });
  const { toast } = useToast();

  // Buscar eventos
  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('fiscal_events')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar eventos:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os eventos"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Limpar formulário
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      date: "",
      status: "upcoming",
      category: "fiscal"
    });
    setEditingEvent(null);
  };

  // Abrir modal para criação
  const handleNewEvent = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // Abrir modal para edição
  const handleEditEvent = (event: FiscalEvent) => {
    setFormData({
      title: event.title,
      description: event.description || "",
      date: event.date,
      status: event.status,
      category: event.category
    });
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  // Salvar evento
  const handleSaveEvent = async () => {
    try {
      if (!formData.title || !formData.date) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Título e data são obrigatórios"
        });
        return;
      }

      if (editingEvent) {
        // Atualizar evento existente
        const { error } = await supabase
          .from('fiscal_events')
          .update(formData)
          .eq('id', editingEvent.id);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Evento atualizado com sucesso"
        });
      } else {
        // Criar novo evento
        const { error } = await supabase
          .from('fiscal_events')
          .insert([formData]);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Evento criado com sucesso"
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchEvents();
    } catch (error: any) {
      console.error('Erro ao salvar evento:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar o evento"
      });
    }
  };

  // Deletar evento
  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('fiscal_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Evento removido com sucesso"
      });
      
      fetchEvents();
    } catch (error: any) {
      console.error('Erro ao deletar evento:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover o evento"
      });
    }
  };

  // Formatar data
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  // Agrupar eventos por mês
  const groupEventsByMonth = (events: FiscalEvent[]) => {
    const grouped: { [key: string]: FiscalEvent[] } = {};
    
    events.forEach(event => {
      const date = new Date(event.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
      
      if (!grouped[monthName]) {
        grouped[monthName] = [];
      }
      grouped[monthName].push(event);
    });
    
    return grouped;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  const groupedEvents = groupEventsByMonth(events);

  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/20">
        <CardHeader className="bg-deepNavy-90">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#020817] dark:text-[#efc349] font-extralight flex items-center">
              <Calendar className="w-6 h-6 mr-2" />
              Calendário Fiscal
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={handleNewEvent}
                  className="bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817] font-extralight"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Evento
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
                <DialogHeader>
                  <DialogTitle className="text-[#020817] dark:text-[#efc349]">
                    {editingEvent ? 'Editar Evento' : 'Novo Evento'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="bg-white dark:bg-[#020817] border-gray-200 dark:border-[#efc349]/30"
                      placeholder="Digite o título do evento"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="bg-white dark:bg-[#020817] border-gray-200 dark:border-[#efc349]/30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger className="bg-white dark:bg-[#020817] border-gray-200 dark:border-[#efc349]/30">
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upcoming">Próximo</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="overdue">Atrasado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger className="bg-white dark:bg-[#020817] border-gray-200 dark:border-[#efc349]/30">
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fiscal">Fiscal</SelectItem>
                        <SelectItem value="contabil">Contábil</SelectItem>
                        <SelectItem value="trabalhista">Trabalhista</SelectItem>
                        <SelectItem value="societario">Societário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="bg-white dark:bg-[#020817] border-gray-200 dark:border-[#efc349]/30"
                      placeholder="Descrição opcional do evento"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={handleSaveEvent}
                      className="flex-1 bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]"
                    >
                      {editingEvent ? 'Atualizar' : 'Criar'} Evento
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      className="border-gray-200 dark:border-[#efc349]/30 text-[#020817] dark:text-[#efc349]"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="bg-deepNavy-90 p-6">
          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-extralight">Nenhum evento cadastrado</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedEvents).map(([month, monthEvents]) => (
                <div key={month} className="space-y-3">
                  <h3 className="text-lg font-extralight text-[#020817] dark:text-[#efc349] capitalize">
                    {month}
                  </h3>
                  <div className="grid gap-3">
                    {monthEvents.map((event) => (
                      <div
                        key={event.id}
                        className="p-4 rounded-lg border border-gray-200 dark:border-[#efc349]/20 bg-white dark:bg-[#020817] hover:border-[#efc349]/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-[#020817] dark:text-white">{event.title}</h4>
                              <span className={`px-2 py-1 rounded text-xs ${
                                event.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                                event.status === 'overdue' ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                                'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                              }`}>
                                {event.status === 'completed' ? 'Concluído' :
                                 event.status === 'overdue' ? 'Atrasado' : 'Próximo'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                              {formatDate(event.date)}
                            </p>
                            {event.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {event.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditEvent(event)}
                              className="border-gray-200 dark:border-[#efc349]/30 text-[#020817] dark:text-[#efc349] hover:bg-gray-50 dark:hover:bg-[#efc349]/10"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteEvent(event.id)}
                              className="border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
