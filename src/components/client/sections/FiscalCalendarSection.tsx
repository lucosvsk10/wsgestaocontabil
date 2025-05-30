
import { useClientData } from "@/hooks/client/useClientData";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, AlertTriangle, CheckCircle2, CircleDot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const FiscalCalendarSection = () => {
  const { fiscalEvents, fetchFiscalEvents, isLoading } = useClientData();

  useEffect(() => {
    fetchFiscalEvents();
  }, [fetchFiscalEvents]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'overdue':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'today':
        return <CircleDot className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'overdue':
        return 'Atrasado';
      case 'today':
        return 'Hoje';
      default:
        return 'Pendente';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-500 text-green-600';
      case 'overdue':
        return 'border-red-500 text-red-600';
      case 'today':
        return 'border-yellow-500 text-yellow-600';
      default:
        return 'border-blue-500 text-blue-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#efc349]"></div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-[#efc349] to-[#d4a017] rounded-xl">
          <Calendar className="w-5 h-5 text-[#0b1320]" />
        </div>
        <h2 className="text-2xl font-light text-[#020817] dark:text-[#efc349]">
          Agenda Fiscal
        </h2>
      </div>

      {fiscalEvents.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="border border-[#efc349]/20 bg-white/80 dark:bg-[#0b1320]/80 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                Nenhum evento fiscal encontrado
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-center">
                Eventos e obrigações fiscais aparecerão aqui
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {fiscalEvents.map((event, index) => (
            <motion.div key={event.id} variants={itemVariants}>
              <Card className="border border-[#efc349]/20 bg-white/80 dark:bg-[#0b1320]/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(event.status)}
                      <div>
                        <CardTitle className="text-lg font-medium text-[#020817] dark:text-[#efc349]">
                          {event.title}
                        </CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {event.category}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getStatusColor(event.status)}`}
                    >
                      {getStatusText(event.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {event.description}
                  </p>
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Vencimento: {new Date(event.date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
