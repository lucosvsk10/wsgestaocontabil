
import { motion } from "framer-motion";
import { FileText, Calculator, Bell, Calendar } from "lucide-react";
import { useQuickStatsData } from "@/hooks/client/useQuickStatsData";

export const QuickStats = () => {
  const { stats, loading } = useQuickStatsData();

  const quickStats = [
    {
      icon: FileText,
      label: "Documentos",
      value: stats.documentsCount,
      color: "text-blue-400"
    },
    {
      icon: Calculator,
      label: "Simulações",
      value: stats.simulationsCount,
      color: "text-green-400"
    },
    {
      icon: Bell,
      label: "Comunicados",
      value: stats.announcementsCount,
      color: "text-yellow-400"
    },
    {
      icon: Calendar,
      label: "Eventos",
      value: stats.upcomingEvents,
      color: "text-purple-400"
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {quickStats.map((_, index) => (
          <div
            key={index}
            className="bg-white dark:bg-[#0b1320] border border-gray-200 dark:border-[#efc349]/20 rounded-lg p-6 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
              </div>
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {quickStats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="bg-white dark:bg-[#0b1320] border border-gray-200 dark:border-[#efc349]/20 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-extralight text-gray-600 dark:text-gray-300">
                {stat.label}
              </p>
              <p className="text-2xl font-extralight text-[#020817] dark:text-white mt-1">
                {stat.value}
              </p>
            </div>
            <stat.icon className={`w-8 h-8 ${stat.color}`} />
          </div>
        </motion.div>
      ))}
    </div>
  );
};
