
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertTriangle, CheckCircle, Calendar as CalendarIcon } from "lucide-react";

export const FiscalCalendarSection = () => {
  // Mock data para eventos fiscais
  const fiscalEvents = [
    {
      id: "1",
      title: "DAS - Simples Nacional",
      date: "2024-01-20",
      description: "Vencimento do DAS referente ao mês de dezembro/2023",
      status: "upcoming",
      category: "Tributos",
      priority: "high"
    },
    {
      id: "2",
      title: "DEFIS - Declaração EFD-ICMS/IPI",
      date: "2024-01-31",
      description: "Entrega da declaração fiscal digital",
      status: "urgent",
      category: "Declarações",
      priority: "urgent"
    },
    {
      id: "3",
      title: "Relatório Mensal",
      date: "2024-01-10",
      description: "Envio do relatório contábil mensal",
      status: "overdue",
      category: "Relatórios",
      priority: "high"
    },
    {
      id: "4",
      title: "SPED Fiscal",
      date: "2024-02-15",
      description: "Entrega do arquivo SPED Fiscal",
      status: "upcoming",
      category: "Declarações",
      priority: "normal"
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "overdue":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "urgent":
        return <Clock className="w-4 h-4 text-orange-500" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "upcoming":
      default:
        return <CalendarIcon className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusColors = (status: string) => {
    switch (status) {
      case "overdue":
        return {
          bg: "bg-red-50 dark:bg-red-900/20",
          border: "border-red-200 dark:border-red-700/30",
          badge: "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-300"
        };
      case "urgent":
        return {
          bg: "bg-orange-50 dark:bg-orange-900/20",
          border: "border-orange-200 dark:border-orange-700/30",
          badge: "bg-orange-100 text-orange-800 dark:bg-orange-800/20 dark:text-orange-300"
        };
      case "completed":
        return {
          bg: "bg-green-50 dark:bg-green-900/20",
          border: "border-green-200 dark:border-green-700/30",
          badge: "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300"
        };
      case "upcoming":
      default:
        return {
          bg: "bg-blue-50 dark:bg-blue-900/20",
          border: "border-blue-200 dark:border-blue-700/30",
          badge: "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-300"
        };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "overdue":
        return "Atrasado";
      case "urgent":
        return "Urgente";
      case "completed":
        return "Concluído";
      case "upcoming":
      default:
        return "Próximo";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Estatísticas
  const stats = {
    total: fiscalEvents.length,
    overdue: fiscalEvents.filter(e => e.status === "overdue").length,
    urgent: fiscalEvents.filter(e => e.status === "urgent").length,
    upcoming: fiscalEvents.filter(e => e.status === "upcoming").length
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header da seção */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#efc349]/10 dark:bg-[#efc349]/20 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-[#efc349]" />
          </div>
          <div>
            <h2 className="text-2xl font-extralight text-[#020817] dark:text-white">
              Agenda Fiscal
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-extralight">
              Acompanhe prazos e obrigações fiscais
            </p>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/30">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-200">{stats.total}</p>
              <p className="text-sm text-blue-600 dark:text-blue-300 font-extralight">Total</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/30">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-700 dark:text-red-200">{stats.overdue}</p>
              <p className="text-sm text-red-600 dark:text-red-300 font-extralight">Atrasados</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700/30">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-200">{stats.urgent}</p>
              <p className="text-sm text-orange-600 dark:text-orange-300 font-extralight">Urgentes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/30">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-700 dark:text-green-200">{stats.upcoming}</p>
              <p className="text-sm text-green-600 dark:text-green-300 font-extralight">Próximos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de eventos */}
      <div className="space-y-4">
        {fiscalEvents.map((event, index) => {
          const statusColors = getStatusColors(event.status);
          
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className={`${statusColors.bg} ${statusColors.border} hover:shadow-lg transition-all duration-300`}>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(event.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-medium text-[#020817] dark:text-white mb-1">
                            {event.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <Badge className={statusColors.badge}>
                              {getStatusText(event.status)}
                            </Badge>
                            <Badge variant="outline" className="font-extralight">
                              {event.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-[#020817] dark:text-white">
                            {formatDate(event.date)}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 dark:text-gray-300 font-extralight">
                        {event.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
