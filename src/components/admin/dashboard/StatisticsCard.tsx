import { ReactNode } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
interface StatisticsCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  iconBgClass: string;
  iconColor: string;
}
export const StatisticsCard = ({
  icon,
  title,
  value,
  iconBgClass,
  iconColor
}: StatisticsCardProps) => {
  return <Card className="bg-white dark:bg-navy-medium border border-gray-200 dark:border-navy-lighter/30">
      <CardContent className="p-6 flex flex-col items-center text-center">
        <div className={`rounded-full ${iconBgClass} p-3 mb-2`}>
          <div className={`h-8 w-8 ${iconColor}`}>
            {icon}
          </div>
        </div>
        <CardTitle className="text-lg font-semibold text-navy dark:text-gold">
          {title}
        </CardTitle>
        <p className="font-bold mt-2 text-navy dark:text-white text-base">
          {value}
        </p>
      </CardContent>
    </Card>;
};