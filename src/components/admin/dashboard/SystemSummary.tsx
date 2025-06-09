
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Bell, Calendar } from "lucide-react";

interface SystemSummaryProps {
  stats: {
    totalUsers: number;
    totalDocuments: number;
    totalAnnouncements: number;
    totalFiscalEvents: number;
  };
}

const SystemSummary = ({ stats }: SystemSummaryProps) => {
  const summaryCards = [
    {
      title: "Usuários",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400"
    },
    {
      title: "Documentos",
      value: stats.totalDocuments,
      icon: FileText,
      color: "text-green-600 dark:text-green-400"
    },
    {
      title: "Avisos",
      value: stats.totalAnnouncements,
      icon: Bell,
      color: "text-yellow-600 dark:text-yellow-400"
    },
    {
      title: "Agenda",
      value: stats.totalFiscalEvents,
      icon: Calendar,
      color: "text-purple-600 dark:text-purple-400"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {summaryCards.map((card, index) => (
        <Card key={index} className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-extralight text-[#020817] dark:text-white">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#020817] dark:text-[#efc349]">
              {card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SystemSummary;
