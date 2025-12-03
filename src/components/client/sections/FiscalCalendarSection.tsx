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
      case 'today': return { color: 'bg-primary', icon: Clock, text: 'Hoje' };
      case 'overdue': return { color: 'bg-destructive', icon: AlertTriangle, text: 'Atrasado' };
      case 'upcoming': return { color: 'bg-amber-500', icon: Calendar, text: 'Pendente' };
      default: return { color: 'bg-muted-foreground', icon: Calendar, text: status };
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="text-center mb-10">
          <div className="w-12 h-12 mx-auto rounded-full bg-muted animate-pulse mb-4" />
          <div className="h-6 w-32 mx-auto bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto py-8 px-4"
    >
      {/* Header minimalista */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-2xl font-light text-foreground mb-1">
          Agenda Fiscal
        </h1>
        <p className="text-sm text-muted-foreground font-light">
          Próximos vencimentos e obrigações
        </p>
      </div>

      {/* Contagem */}
      <p className="text-xs text-muted-foreground mb-4">
        {events.length} evento{events.length !== 1 ? 's' : ''}
      </p>

      {events.length === 0 ? (
        <div className="bg-card rounded-xl p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
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
        <div className="bg-card rounded-xl overflow-hidden">
          <div className="divide-y divide-border/50">
            {events.map((event, index) => {
              const statusInfo = getStatusIndicator(event.status);
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="group py-4 px-5 transition-all duration-200 hover:bg-muted/50"
                >
                  <div className="flex items-start gap-4">
                    {/* Indicador de status */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      event.status === 'completed' ? 'bg-green-500/10' :
                      event.status === 'today' ? 'bg-primary/10' :
                      event.status === 'overdue' ? 'bg-destructive/10' :
                      'bg-amber-500/10'
                    }`}>
                      <div className={`w-2.5 h-2.5 rounded-full ${statusInfo.color}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-foreground">
                          {event.title}
                        </h3>
                        {event.status === 'overdue' && (
                          <span className="text-[10px] uppercase tracking-wider text-destructive font-medium bg-destructive/10 px-1.5 py-0.5 rounded">
                            Atrasado
                          </span>
                        )}
                        {event.status === 'today' && (
                          <span className="text-[10px] uppercase tracking-wider text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded">
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
                        <span className="text-border">•</span>
                        <span>{event.category}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
};
