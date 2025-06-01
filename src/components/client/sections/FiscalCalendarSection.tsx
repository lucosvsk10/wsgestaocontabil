
import { useClientData } from "@/hooks/client/useClientData";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, AlertCircle, CheckCircle } from "lucide-react";
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
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'today':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'upcoming':
        return <CheckCircle className="w-5 h-5 text-blue-400" />;
      default:
        return <Calendar className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'overdue':
        return <Badge variant="destructive">Atrasado</Badge>;
      case 'today':
        return <Badge className="bg-yellow-600 text-white">Hoje</Badge>;
      case 'upcoming':
        return <Badge className="bg-blue-600 text-white">Próximo</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
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
        <div className="p-3 bg-gradient-to-r from-[#efc349] to-[#d4a017] rounded-xl">
          <Calendar className="w-6 h-6 text-[#0b1320]" />
        </div>
        <h2 className="text-2xl font-light text-[#efc349] tracking-wide">
          AGENDA FISCAL
        </h2>
      </div>

      {fiscalEvents.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="border border-[#efc349]/20 bg-[#1a2633]/80 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Calendar className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                Nenhum evento encontrado
              </h3>
              <p className="text-gray-400 text-center">
                Eventos e obrigações fiscais aparecerão aqui
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {fiscalEvents.map((event, index) => (
            <motion.div key={event.id} variants={itemVariants}>
              <Card className="border border-[#efc349]/20 bg-[#1a2633]/80 backdrop-blur-sm hover:shadow-lg hover:border-[#efc349]/40 transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium text-[#efc349] flex items-center gap-2">
                      {getStatusIcon(event.status)}
                      {event.title}
                    </CardTitle>
                    {getStatusBadge(event.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-200">
                      {new Date(event.date).toLocaleDateString('pt-BR')}
                    </span>
                    <Badge variant="outline" className="text-xs border-gray-500 text-gray-300">
                      {event.category}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-300 leading-relaxed">
                    {event.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
