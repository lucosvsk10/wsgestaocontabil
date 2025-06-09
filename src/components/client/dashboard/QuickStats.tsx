
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
      color: "text-blue-500"
    },
    {
      title: "Simulações",
      value: loading ? "..." : stats.simulationsCount,
      icon: Calculator,
      color: "text-green-500"
    },
    {
      title: "Agenda",
      value: loading ? "..." : stats.upcomingEvents,
      icon: Calendar,
      color: "text-purple-500"
    },
    {
      title: "Comunicados",
      value: loading ? "..." : stats.announcementsCount,
      icon: MessageSquare,
      color: "text-orange-500"
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
          <Card className="bg-[#0b1320] border-[#efc349]/20 hover:border-[#efc349]/40 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-extralight">{stat.title}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
