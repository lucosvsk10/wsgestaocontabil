
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
          className="bg-[#0b1320] border border-[#efc349]/20 rounded-lg p-4 text-center"
        >
          <stat.icon className={`w-8 h-8 mx-auto mb-2 ${stat.color}`} />
          <p className="text-2xl font-bold text-white">{stat.value}</p>
          <p className="text-sm text-gray-400 font-extralight">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
};
