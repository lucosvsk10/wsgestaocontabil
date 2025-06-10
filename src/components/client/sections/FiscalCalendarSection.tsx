
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, AlertTriangle, CheckCircle, MapPin, Tag } from "lucide-react";
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
        
        let status: 'upcoming' | 'today' | 'overdue' | 'completed' = event.status as 'upcoming' | 'today' | 'overdue' | 'completed';
        if (eventDate.toDateString() === today.toDateString()) {
          status = 'today';
        } else if (eventDate < today && status !== 'completed') {
          status = 'overdue';
        } else if (eventDate >= tomorrow) {
          status = 'upcoming';
        }
        
        return { ...event, status } as FiscalEvent;
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
      <Card className="bg-white dark:bg-[#020817] border-gray-200 dark:border-[#efc349]/20 shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 dark:bg-[#0b1320] rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-[#020817] border-gray-200 dark:border-[#efc349]/20 shadow-sm">
      <CardHeader className="bg-white dark:bg-[#020817] border-b border-gray-200 dark:border-[#efc349]/20">
        <CardTitle className="text-[#020817] dark:text-[#efc349] font-semibold flex items-center text-2xl">
          <Calendar className="w-6 h-6 mr-3" />
          Agenda Fiscal
          <Badge variant="outline" className="ml-3 border-gray-300 dark:border-[#efc349]/30 text-[#020817] dark:text-[#efc349] font-normal">
            {events.length} {events.length === 1 ? 'evento' : 'eventos'}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="bg-white dark:bg-[#020817] p-6">
        {events.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-[#0b1320] rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-[#020817] dark:text-white mb-2">
              Nenhum evento agendado
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Aguardando novos eventos fiscais
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="group bg-white dark:bg-[#0b1320] border border-gray-200 dark:border-[#efc349]/20 rounded-xl p-6 hover:border-[#efc349]/50 dark:hover:border-[#efc349]/40 transition-all duration-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-[#020817] border border-gray-200 dark:border-[#efc349]/30 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-[#020817] dark:text-[#efc349]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#020817] dark:text-white text-lg mb-2 group-hover:text-[#020817] dark:group-hover:text-[#efc349] transition-colors">
                        {event.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-3">
                        {event.description}
                      </p>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(event.status)} text-white flex items-center gap-2 px-3 py-1 flex-shrink-0 font-medium`}>
                    {getStatusIcon(event.status)}
                    {getStatusText(event.status)}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-[#efc349]/10">
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4 mr-2" />
                      <span className="font-medium">
                        {new Date(event.date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <Tag className="w-4 h-4 mr-2" />
                      <Badge 
                        variant="outline" 
                        className="border-gray-300 dark:border-[#efc349]/30 text-[#020817] dark:text-[#efc349] font-normal bg-white dark:bg-transparent"
                      >
                        {event.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
