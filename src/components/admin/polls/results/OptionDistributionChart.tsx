
import {
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';
import { CHART_COLORS } from './ChartColors';

interface ChartDataItem {
  name: string;
  value: number;
  percentage?: string;
  label?: string;
  count?: number;
}

interface OptionDistributionChartProps {
  data: ChartDataItem[];
  xAxisAngle?: number;
  xAxisHeight?: number;
  valueKey?: string;
  labelKey?: string;
  height?: number;
  showPercentage?: boolean;
}

export const OptionDistributionChart = ({ 
  data, 
  xAxisAngle = -45, 
  xAxisHeight = 70,
  valueKey = "value",
  labelKey = "name",
  height = 300,
  showPercentage = true
}: OptionDistributionChartProps) => {
  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey={labelKey} 
            angle={xAxisAngle} 
            textAnchor="end"
            height={xAxisHeight}
            interval={0}
          />
          <YAxis allowDecimals={false} />
          <RechartsTooltip 
            formatter={(value: any, name: any, props: any) => [
              showPercentage && props.payload.percentage 
                ? `${value} votos (${props.payload.percentage})`
                : `${value} respostas`,
              "Quantidade"
            ]} 
          />
          <Bar dataKey={valueKey} name="Votos">
            {data.map((item, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={CHART_COLORS[index % CHART_COLORS.length]} 
              />
            ))}
            {showPercentage && (
              <LabelList 
                dataKey="percentage" 
                position="top" 
                style={{ fill: "#666", fontWeight: "bold" }} 
              />
            )}
            {!showPercentage && (
              <LabelList dataKey="count" position="top" />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
