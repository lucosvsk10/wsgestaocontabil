import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Calculator, MessageSquare } from "lucide-react";
import { useQuickStatsData } from "@/hooks/client/useQuickStatsData";
interface QuickStatsProps {
  onTabChange?: (tab: string) => void;
}
export const QuickStats = ({
  onTabChange
}: QuickStatsProps) => {
  const {
    stats,
    loading
  } = useQuickStatsData();
  const statsData = [{
    title: "Documentos",
    value: loading ? "..." : stats.documentsCount,
    icon: FileText,
    color: "text-blue-500",
    tab: "documents"
  }, {
    title: "Simulações",
    value: loading ? "..." : stats.simulationsCount,
    icon: Calculator,
    color: "text-green-500",
    tab: "simulations"
  }, {
    title: "Comunicados",
    value: loading ? "..." : stats.announcementsCount,
    icon: MessageSquare,
    color: "text-orange-500",
    tab: "announcements"
  }];
  return <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
      {statsData.map((stat, index) => {})}
    </div>;
};