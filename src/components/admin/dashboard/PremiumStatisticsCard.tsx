
import { ReactNode } from "react";

interface PremiumStatisticsCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export const PremiumStatisticsCard = ({
  icon,
  title,
  value,
  subtitle,
  trend
}: PremiumStatisticsCardProps) => {
  return (
    <div className="bg-[#0b0f1c] border border-[#efc349] rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-[#efc349]/10 group">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-[#efc349]/10 rounded-lg border border-[#efc349]/20 group-hover:bg-[#efc349]/20 transition-all duration-300">
          <div className="text-[#efc349] w-6 h-6">
            {icon}
          </div>
        </div>
        {trend && (
          <div className={`px-2 py-1 rounded text-xs font-bebas-neue ${
            trend.isPositive 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {trend.isPositive ? '+' : ''}{trend.value}
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <h3 className="text-[#b3b3b3] text-sm font-bebas-neue tracking-wide uppercase">
          {title}
        </h3>
        <p className="text-[#ffffff] text-3xl font-museo-moderno font-bold">
          {value}
        </p>
        {subtitle && (
          <p className="text-[#b3b3b3] text-xs font-bebas-neue">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
