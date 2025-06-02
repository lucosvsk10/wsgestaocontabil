
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FiscalEvent } from "@/types/client";
import { supabase } from "@/integrations/supabase/client";

export const FiscalCalendarSection = () => {
  const [events, setEvents] = useState<FiscalEvent[]>([]);
  const [loading, setLoading] = useState(true);

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
      
      // Atualizar status baseado na data
      const updatedEvents = (data || []).map(event => {
        const eventDate = new Date(event.date);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        let status = event.status;
        if (eventDate.toDateString() === today.toDateString()) {
          status = 'today';
        } else if (eventDate < today && status !== 'completed') {
          status = 'overdue';
        } else if (eventDate >= tomorrow) {
          status = 'upcoming';
        }
        
        return { ...event, status };
      });
      
      setEvents(updatedEvents);
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-600 hover:bg-green-700';
      case 'today': return 'bg-blue-600 hover:bg-blue-700';
      case 'overdue': return 'bg-red-600 hover:bg-red-700';
      case 'upcoming': return 'bg-yellow-600 hover:bg-yellow-700';
      default: return 'bg-gray-600 hover:bg-gray-700';
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
      <Card className="bg-[#0b1320] border-[#efc349]/20">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-[#020817] rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#0b1320] border-[#efc349]/20">
      <CardHeader>
        <CardTitle className="text-[#efc349] font-extralight flex items-center">
          <Calendar className="w-6 h-6 mr-2" />
          Agenda Fiscal
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-extralight">Nenhum evento agendado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-[#020817] border border-[#efc349]/20 rounded-lg p-4 hover:border-[#efc349]/40 transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-white text-lg">
                    {event.title}
                  </h3>
                  <Badge className={`${getStatusColor(event.status)} text-white flex items-center gap-1`}>
                    {getStatusIcon(event.status)}
                    {getStatusText(event.status)}
                  </Badge>
                </div>

                <p className="text-gray-300 font-extralight mb-3">
                  {event.description}
                </p>

                <div className="flex justify-between items-center">
                  <div className="flex items-center text-sm text-gray-400">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(event.date).toLocaleDateString('pt-BR')}
                  </div>
                  <Badge variant="outline" className="border-[#efc349]/30 text-[#efc349]">
                    {event.category}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
