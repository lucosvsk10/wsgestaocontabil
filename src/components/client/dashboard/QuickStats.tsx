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
  const stats = [{
    icon: FileText,
    label: "Documentos",
    value: documentsCount,
    color: "text-blue-400"
  }, {
    icon: Calculator,
    label: "Simulações",
    value: simulationsCount,
    color: "text-green-400"
  }, {
    icon: Bell,
    label: "Comunicados",
    value: announcementsCount,
    color: "text-yellow-400"
  }, {
    icon: Calendar,
    label: "Eventos",
    value: upcomingEvents,
    color: "text-purple-400"
  }];
  return <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => {})}
    </div>;
};