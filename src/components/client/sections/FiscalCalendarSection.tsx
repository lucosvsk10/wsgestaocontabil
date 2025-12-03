import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, AlertTriangle, CheckCircle } from "lucide-react";
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

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'completed': return { color: 'bg-green-500', icon: CheckCircle, text: 'Concluído' };
      case 'today': return { color: 'bg-blue-500', icon: Clock, text: 'Hoje' };
      case 'overdue': return { color: 'bg-red-500', icon: AlertTriangle, text: 'Atrasado' };
      case 'upcoming': return { color: 'bg-amber-500', icon: Calendar, text: 'Pendente' };
      default: return { color: 'bg-gray-500', icon: Calendar, text: status };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-foreground/5 animate-pulse" />
          <div className="h-6 w-32 mx-auto bg-foreground/5 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-foreground/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header minimalista */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto rounded-full bg-foreground/5 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-light text-foreground">Agenda Fiscal</h1>
        <p className="text-sm text-muted-foreground">
          Próximos vencimentos e obrigações
        </p>
      </div>

      {/* Contagem */}
      <p className="text-xs text-muted-foreground">
        {events.length} evento{events.length !== 1 ? 's' : ''}
      </p>

      {events.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-foreground/5 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">
            Nenhum evento agendado
          </h3>
          <p className="text-xs text-muted-foreground">
            Aguardando novos eventos fiscais
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {events.map((event, index) => {
            const statusInfo = getStatusIndicator(event.status);
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="group py-4 px-4 rounded-lg transition-all duration-200 hover:bg-foreground/5"
              >
                <div className="flex items-start gap-4">
                  {/* Indicador de status como círculo pequeno */}
                  <div className="flex-shrink-0 pt-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${statusInfo.color}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-foreground">
                        {event.title}
                      </h3>
                      {event.status === 'overdue' && (
                        <span className="text-[10px] uppercase tracking-wider text-destructive font-medium">
                          Atrasado
                        </span>
                      )}
                      {event.status === 'today' && (
                        <span className="text-[10px] uppercase tracking-wider text-blue-500 font-medium">
                          Hoje
                        </span>
                      )}
                    </div>
                    
                    {event.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                        {event.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(event.date).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-foreground/30">•</span>
                      <span>{event.category}</span>
                    </div>
                  </div>
                </div>

                {/* Divisor sutil entre itens */}
                {index < events.length - 1 && (
                  <div className="mt-4 border-b border-border/20" />
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
