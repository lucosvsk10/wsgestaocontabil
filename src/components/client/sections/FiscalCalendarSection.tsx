
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/hooks/client/useClientData';
import { Badge } from '@/components/ui/badge';

export const FiscalCalendarSection = () => {
  const { user } = useAuth();
  const { fiscalEvents, fetchFiscalEvents } = useClientData();

  useEffect(() => {
    if (user?.id) {
      fetchFiscalEvents();
    }
  }, [user?.id, fetchFiscalEvents]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'today':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
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

  const getCardColors = (status: string) => {
    switch (status) {
      case 'today':
        return 'border-yellow-200 dark:border-yellow-500/30 bg-yellow-50 dark:bg-yellow-900/20';
      case 'overdue':
        return 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-900/20';
      case 'completed':
        return 'border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-900/20';
      default:
        return 'border-[#e6e6e6] dark:border-[#efc349]/30 bg-white dark:bg-transparent';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extralight text-[#020817] dark:text-[#efc349]">
          Agenda Fiscal
        </h2>
        <Badge variant="outline" className="font-extralight">
          {fiscalEvents.length} {fiscalEvents.length === 1 ? 'evento' : 'eventos'}
        </Badge>
      </div>

      {fiscalEvents.length === 0 ? (
        <Card className="border border-[#e6e6e6] dark:border-[#efc349]/30 bg-white dark:bg-transparent">
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <p className="text-gray-600 dark:text-gray-400 font-extralight mb-2">
              Nenhum evento fiscal programado
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 font-extralight">
              Eventos fiscais importantes aparecerão aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {fiscalEvents.map((event) => (
            <Card 
              key={event.id} 
              className={`border ${getCardColors(event.status)} transition-all hover:shadow-md`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#efc349]/10">
                      <Calendar className="w-5 h-5 text-[#efc349]" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349]">
                        {event.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(event.status)}
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-extralight">
                          {formatDate(event.date)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(event.status)}
                    <Badge variant="outline" className="font-extralight text-xs">
                      {event.category}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-[#020817] dark:text-white font-extralight leading-relaxed">
                  {event.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
