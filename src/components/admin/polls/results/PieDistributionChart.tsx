
import {
  PieChart, 
  Pie, 
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import { CHART_COLORS } from './ChartColors';

interface ChartDataItem {
  name: string;
  value: number;
}

interface PieDistributionChartProps {
  data: ChartDataItem[];
  height?: number;
}

export const PieDistributionChart = ({ 
  data, 
  height = 300 
}: PieDistributionChartProps) => {
  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={true}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={CHART_COLORS[index % CHART_COLORS.length]} 
              />
            ))}
          </Pie>
          <RechartsTooltip formatter={(value) => [`${value} votos`, ""]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
