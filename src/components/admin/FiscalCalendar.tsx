import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, Edit, Trash2, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FiscalEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  status: 'upcoming' | 'today' | 'overdue' | 'completed';
  created_by: string;
  created_at: string;
}

const FiscalCalendar = () => {
  const [events, setEvents] = useState<FiscalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FiscalEvent | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    category: "fiscal",
    status: "upcoming"
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('fiscal_events')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      
      // Map the data to ensure status is properly typed
      const typedEvents: FiscalEvent[] = (data || []).map(event => ({
        ...event,
        status: event.status as 'upcoming' | 'today' | 'overdue' | 'completed'
      }));
      
      setEvents(typedEvents);
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os eventos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingEvent) {
        const { error } = await supabase
          .from('fiscal_events')
          .update(formData)
          .eq('id', editingEvent.id);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Evento atualizado com sucesso."
        });
      } else {
        const { error } = await supabase
          .from('fiscal_events')
          .insert([formData]);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Evento criado com sucesso."
        });
      }

      fetchEvents();
      handleCloseDialog();
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o evento.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Deseja realmente excluir este evento?')) return;

    try {
      const { error } = await supabase
        .from('fiscal_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Evento excluído com sucesso."
      });
      fetchEvents();
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o evento.",
        variant: "destructive"
      });
    }
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingEvent(null);
    setFormData({
      title: "",
      description: "",
      date: "",
      category: "fiscal",
      status: "upcoming"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-600 hover:bg-green-700 text-white';
      case 'today': return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'overdue': return 'bg-red-600 hover:bg-red-700 text-white';
      case 'upcoming': return 'bg-yellow-600 hover:bg-yellow-700 text-white';
      default: return 'bg-gray-600 hover:bg-gray-700 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'today': return <Clock className="w-4 h-4" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4" />;
      case 'upcoming': return <Calendar className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'today': return 'Hoje';
      case 'overdue': return 'Atrasado';
      case 'upcoming': return 'Pendente';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Calendar className="h-12 w-12 text-[#efc349] mx-auto mb-4 animate-spin" />
          <p className="text-[#020817] dark:text-white font-extralight">Carregando eventos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl text-[#020817] dark:text-[#efc349] mb-4 font-extralight">
            Agenda Fiscal
          </h1>
          <p className="text-gray-600 dark:text-white/70 font-extralight">
            Gerencie eventos e prazos fiscais
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#020817] dark:bg-transparent border border-[#efc349] text-white dark:text-[#efc349] hover:bg-[#020817]/90 dark:hover:bg-[#efc349]/10">
              <Plus className="h-4 w-4 mr-2" />
              Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
            <DialogHeader>
              <DialogTitle className="text-[#020817] dark:text-[#efc349] font-extralight">
                {editingEvent ? 'Editar Evento' : 'Novo Evento'}
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-white/70 font-extralight">
                {editingEvent ? 'Edite as informações do evento' : 'Adicione um novo evento fiscal'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-[#020817] dark:text-white font-extralight">
                  Título
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-[#020817] dark:text-white font-extralight">
                  Descrição
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-[#020817] dark:text-white font-extralight">
                    Data
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-[#020817] dark:text-white font-extralight">
                    Categoria
                  </Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
                      <SelectItem value="fiscal">Fiscal</SelectItem>
                      <SelectItem value="contabil">Contábil</SelectItem>
                      <SelectItem value="trabalhista">Trabalhista</SelectItem>
                      <SelectItem value="geral">Geral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-[#020817] dark:text-white font-extralight">
                  Status
                </Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
                    <SelectItem value="upcoming">Pendente</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCloseDialog} className="border-gray-200 dark:border-[#efc349]/30">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave}
                  className="bg-[#020817] dark:bg-transparent border border-[#efc349] text-white dark:text-[#efc349] hover:bg-[#020817]/90 dark:hover:bg-[#efc349]/10"
                >
                  {editingEvent ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/20 hover:shadow-lg dark:hover:shadow-none transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-[#020817] dark:text-white font-extralight text-lg">
                      {event.title}
                    </CardTitle>
                    <Badge className={getStatusColor(event.status)}>
                      {getStatusIcon(event.status)}
                      <span className="ml-1">{getStatusText(event.status)}</span>
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingEvent(event);
                        setFormData({
                          title: event.title,
                          description: event.description,
                          date: event.date,
                          category: event.category,
                          status: event.status
                        });
                        setIsCreateDialogOpen(true);
                      }}
                      className="h-8 w-8 p-0 hover:bg-[#efc349]/10"
                    >
                      <Edit className="h-4 w-4 text-[#020817] dark:text-[#efc349]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(event.id)}
                      className="h-8 w-8 p-0 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-gray-600 dark:text-gray-300 font-extralight text-sm">
                  {event.description}
                </p>

                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center text-gray-500 dark:text-gray-400">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(event.date).toLocaleDateString('pt-BR')}
                  </div>
                  <Badge variant="outline" className="border-[#efc349]/30 text-[#020817] dark:text-[#efc349] font-extralight">
                    {event.category}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {events.length === 0 && (
        <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 dark:text-white/40 mb-4" />
            <h3 className="text-lg font-extralight text-[#020817] dark:text-white mb-2">
              Nenhum evento cadastrado
            </h3>
            <p className="text-gray-600 dark:text-white/70 text-center font-extralight">
              Adicione eventos fiscais para organizar sua agenda.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FiscalCalendar;
