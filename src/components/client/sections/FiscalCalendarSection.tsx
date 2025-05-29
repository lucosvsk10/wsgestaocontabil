
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { FiscalEvent } from '@/types/client';
import { useClientData } from '@/hooks/client/useClientData';

export const FiscalCalendarSection = () => {
  const { fiscalEvents, fetchFiscalEvents } = useClientData();

  useEffect(() => {
    fetchFiscalEvents();
  }, [fetchFiscalEvents]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'today':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge variant="outline" className="text-blue-600 border-blue-300 font-extralight">Em breve</Badge>;
      case 'today':
        return <Badge variant="outline" className="text-orange-600 border-orange-300 font-extralight">Hoje</Badge>;
      case 'overdue':
        return <Badge variant="destructive" className="font-extralight">Vencido</Badge>;
      default:
        return <Badge variant="default" className="font-extralight">Concluído</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
      <CardHeader>
        <CardTitle className="flex items-center text-[#020817] dark:text-[#efc349] font-extralight text-xl">
          <Calendar className="mr-2 h-5 w-5" />
          Agenda Fiscal
        </CardTitle>
      </CardHeader>
      <CardContent>
        {fiscalEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 font-extralight">
            Nenhum evento fiscal encontrado
          </div>
        ) : (
          <div className="space-y-4">
            {fiscalEvents.map((event) => (
              <div
                key={event.id}
                className="p-4 rounded-lg border border-gray-200 dark:border-[#efc349]/30 bg-gray-50 dark:bg-[#0b1320]/50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(event.status)}
                    <h3 className="font-extralight text-[#020817] dark:text-white">
                      {event.title}
                    </h3>
                  </div>
                  {getStatusBadge(event.status)}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-extralight mb-2">
                  {event.description}
                </p>
                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-extralight">
                    Data: {formatDate(event.date)}
                  </span>
                  <span className="font-extralight">
                    Categoria: {event.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
