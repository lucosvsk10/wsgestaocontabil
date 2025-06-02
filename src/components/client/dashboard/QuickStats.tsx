
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
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="bg-[#0b1320] border border-[#efc349]/20 rounded-lg p-4 text-center hover:border-[#efc349]/40 transition-all"
        >
          <stat.icon className={`w-8 h-8 ${stat.color} mx-auto mb-2`} />
          <div className="text-2xl font-extralight text-white">{stat.value}</div>
          <div className="text-sm text-gray-400 font-extralight">{stat.label}</div>
        </motion.div>
      ))}
    </div>
  );
};
