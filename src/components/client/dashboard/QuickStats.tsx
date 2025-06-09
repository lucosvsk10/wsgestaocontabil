
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Calculator, Calendar, MessageSquare } from "lucide-react";
import { useQuickStatsData } from "@/hooks/client/useQuickStatsData";

export const QuickStats = () => {
  const { stats, loading } = useQuickStatsData();

  const statsData = [
    {
      title: "Documentos",
      value: loading ? "..." : stats.documentsCount,
      icon: FileText,
      color: "text-[#efc349]",
      bgColor: "bg-[#efc349]/10"
    },
    {
      title: "Simulações",
      value: loading ? "..." : stats.simulationsCount,
      icon: Calculator,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Agenda",
      value: loading ? "..." : stats.upcomingEvents,
      icon: Calendar,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      title: "Comunicados",
      value: loading ? "..." : stats.announcementsCount,
      icon: MessageSquare,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {statsData.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Card className="bg-white dark:bg-[#0b1320] border-[#e6e6e6] dark:border-[#efc349]/20 hover:border-[#efc349]/40 dark:hover:border-[#efc349]/50 transition-all duration-300 hover:shadow-lg dark:hover:shadow-[#efc349]/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm font-extralight mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-[#020817] dark:text-white">
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
