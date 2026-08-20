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
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
      {statsData.map((stat, index) => (
        <motion.div
          key={stat.tab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors rounded-xl"
            onClick={() => onTabChange?.(stat.tab)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`w-6 h-6 shrink-0 ${stat.color}`} strokeWidth={1.75} />
              <div>
                <p className="text-2xl font-semibold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};