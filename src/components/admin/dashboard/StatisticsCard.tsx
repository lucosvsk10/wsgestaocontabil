
import { ReactNode } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

interface StatisticsCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export const StatisticsCard = ({
  icon,
  title,
  value,
  trend
}: StatisticsCardProps) => {
  return (
    <Card className="border-[#e6e6e6] dark:border-[#efc349]/20 bg-white dark:bg-[#0b1320] hover:shadow-lg transition-shadow">
      <CardContent className="p-6 flex flex-col items-center text-center">
        <div className="rounded-full bg-[#efc349]/10 p-3 mb-4">
          <div className="h-8 w-8 text-[#efc349]">
            {icon}
          </div>
        </div>
        <CardTitle className="text-lg text-[#020817] dark:text-[#efc349] font-extralight mb-2">
          {title}
        </CardTitle>
        <p className="font-extralight mt-2 text-[#020817] dark:text-white text-2xl">
          {value}
        </p>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-sm font-extralight ${
            trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            <span>{trend.value}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
