
import { motion } from "framer-motion";
import { FileText, Calculator, Bell, Calendar } from "lucide-react";

interface QuickStatsProps {
  documentsCount: number;
  simulationsCount: number;
  announcementsCount: number;
  upcomingEvents: number;
}

export const QuickStats = ({
  documentsCount,
  simulationsCount,
  announcementsCount,
  upcomingEvents
}: QuickStatsProps) => {
  const stats = [
    {
      icon: FileText,
      label: "Documentos",
      value: documentsCount,
      color: "text-blue-400"
    },
    {
      icon: Calculator,
      label: "Simulações",
      value: simulationsCount,
      color: "text-green-400"
    },
    {
      icon: Bell,
      label: "Comunicados",
      value: announcementsCount,
      color: "text-yellow-400"
    },
    {
      icon: Calendar,
      label: "Eventos",
      value: upcomingEvents,
      color: "text-purple-400"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="bg-white dark:bg-[#0b1320] border border-gray-200 dark:border-[#efc349]/20 rounded-lg p-6 transition-all hover:shadow-md"
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
