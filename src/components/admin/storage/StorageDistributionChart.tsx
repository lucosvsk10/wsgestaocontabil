
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { formatSize } from "@/utils/storage/formatSize";

interface StorageDistributionChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export const StorageDistributionChart = ({ data }: StorageDistributionChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400 font-extralight">
        Nenhum dado disponível
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white dark:bg-[#0b1320] border border-[#e6e6e6] dark:border-[#efc349]/20 rounded-lg p-3 shadow-lg">
          <p className="font-extralight text-[#020817] dark:text-white">
            {data.name}: {formatSize(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ 
            fontSize: '14px',
            fontWeight: '200',
            color: 'var(--foreground)'
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};
