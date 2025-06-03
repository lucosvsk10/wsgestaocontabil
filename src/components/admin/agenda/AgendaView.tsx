
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CreateEventDialog } from "./CreateEventDialog";
import { EventList } from "./EventList";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FiscalEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  category: string;
  status: string;
  created_at: string;
  created_by: string | null;
}

export const AgendaView = () => {
  const [events, setEvents] = useState<FiscalEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('fiscal_events')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        toast({
          title: "Erro ao carregar eventos",
          description: "Não foi possível carregar os eventos da agenda.",
          variant: "destructive"
        });
      } else {
        setEvents(data || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreateEvent = async (eventData: {
    title: string;
    description: string;
    date: string;
    category: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('fiscal_events')
        .insert([eventData])
        .select()
        .single();

      if (error) {
        console.error('Error creating event:', error);
        toast({
          title: "Erro ao criar evento",
          description: "Não foi possível criar o evento.",
          variant: "destructive"
        });
        return false;
      }

      setEvents(prev => [...prev, data]);
      toast({
        title: "Evento criado",
        description: "O evento foi criado com sucesso.",
      });
      return true;
    } catch (error) {
      console.error('Error creating event:', error);
      return false;
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('fiscal_events')
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error('Error deleting event:', error);
        toast({
          title: "Erro ao excluir evento",
          description: "Não foi possível excluir o evento.",
          variant: "destructive"
        });
        return;
      }

      setEvents(prev => prev.filter(event => event.id !== eventId));
      toast({
        title: "Evento excluído",
        description: "O evento foi excluído com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  // Get events for selected date
  const selectedDateEvents = events.filter(event => {
    if (!selectedDate) return false;
    const eventDate = new Date(event.date);
    return eventDate.toDateString() === selectedDate.toDateString();
  });

  // Get dates that have events for calendar highlighting
  const eventDates = events.map(event => new Date(event.date));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#020817] dark:border-[#efc349]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extralight text-[#020817] dark:text-white">
            Agenda Fiscal
          </h1>
          <p className="text-gray-600 dark:text-gray-300 font-extralight mt-2">
            Gerencie eventos e datas importantes da agenda fiscal
          </p>
        </div>
        
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-[#020817] hover:bg-[#020817]/90 text-white dark:bg-transparent dark:border dark:border-[#efc349] dark:text-[#efc349] dark:hover:bg-[#efc349]/10"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Evento
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Calendar */}
        <Card className="border-[#e6e6e6] dark:border-[#efc349]/20 bg-white dark:bg-[#0b1320]">
          <CardHeader className="bg-white dark:bg-[#0b1320]">
            <CardTitle className="font-extralight text-[#020817] dark:text-[#efc349] flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Calendário
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-white dark:bg-[#0b1320]">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border-0"
              modifiers={{
                hasEvent: eventDates
              }}
              modifiersStyles={{
                hasEvent: {
                  backgroundColor: '#efc349',
                  color: '#020817',
                  fontWeight: 'bold'
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Events for Selected Date */}
        <Card className="border-[#e6e6e6] dark:border-[#efc349]/20 bg-white dark:bg-[#0b1320]">
          <CardHeader className="bg-white dark:bg-[#0b1320]">
            <CardTitle className="font-extralight text-[#020817] dark:text-[#efc349]">
              Eventos - {selectedDate?.toLocaleDateString('pt-BR')}
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-white dark:bg-[#0b1320]">
            <EventList 
              events={selectedDateEvents}
              onDeleteEvent={handleDeleteEvent}
            />
          </CardContent>
        </Card>
      </div>

      {/* All Events List */}
      <Card className="border-[#e6e6e6] dark:border-[#efc349]/20 bg-white dark:bg-[#0b1320]">
        <CardHeader className="bg-white dark:bg-[#0b1320]">
          <CardTitle className="font-extralight text-[#020817] dark:text-[#efc349]">
            Todos os Eventos
          </CardTitle>
        </CardHeader>
        <CardContent className="bg-white dark:bg-[#0b1320]">
          <EventList 
            events={events}
            onDeleteEvent={handleDeleteEvent}
            showAll
          />
        </CardContent>
      </Card>

      <CreateEventDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateEvent={handleCreateEvent}
      />
    </div>
  );
};
