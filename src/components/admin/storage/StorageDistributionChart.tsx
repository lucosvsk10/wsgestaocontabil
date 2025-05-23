
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { UserStorageData } from "@/hooks/useStorageStats";

interface StorageDistributionChartProps {
  storageData: UserStorageData[];
  formatSize: (size: number) => string;
}

export const StorageDistributionChart = ({ 
  storageData, 
  formatSize 
}: StorageDistributionChartProps) => {
  // Colors for the chart bars
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00C49F'];

  return (
    <div className="h-80 mt-6 p-4 bg-white dark:bg-navy-deeper rounded-lg border border-gray-200 dark:border-navy-lighter/30">
      <h3 className="text-lg font-semibold text-navy-dark dark:text-gold mb-4">
        Armazenamento por Cliente
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={storageData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <XAxis 
            dataKey="name" 
            tick={{ fill: '#333333', fillOpacity: 0.7 }}
            tickFormatter={(value) => value ? (value.length > 10 ? `${value.substring(0, 10)}...` : value) : 'Sem nome'}
          />
          <YAxis 
            tick={{ fill: '#333333', fillOpacity: 0.7 }}
            tickFormatter={(value) => formatSize(value)}
          />
          <Tooltip 
            formatter={(value: any) => formatSize(value)}
            labelFormatter={(value) => value || 'Sem nome'}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', color: '#0a2946' }}
            itemStyle={{ color: '#0a2946' }}
          />
          <Bar dataKey="sizeBytes" name="Tamanho" fill="#8884d8">
            {storageData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
