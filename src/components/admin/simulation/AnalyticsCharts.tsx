
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { 
  PieChart, 
  Pie, 
  Cell, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import { TaxSimulation } from "@/types/taxSimulation";
import { useMemo } from "react";

interface AnalyticsChartsProps {
  simulations: TaxSimulation[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD'];

export const AnalyticsCharts = ({ simulations }: AnalyticsChartsProps) => {
  const chartData = useMemo(() => {
    if (!simulations.length) return {
      typeDistribution: [],
      resultDistribution: [],
      incomeRanges: []
    };
    
    const typeDistribution = [
      { name: 'Completa', value: simulations.filter(s => s.tipo_simulacao.includes('completa')).length },
      { name: 'Simplificada', value: simulations.filter(s => s.tipo_simulacao.includes('simplificada')).length }
    ];
    
    const resultDistribution = [
      { name: 'A Pagar', value: simulations.filter(s => s.tipo_simulacao === 'a pagar').length },
      { name: 'Restituição', value: simulations.filter(s => s.tipo_simulacao === 'restituição').length }
    ];
    
    const incomeRanges = [
      { range: 'Até 50 mil', count: 0 },
      { range: '50-100 mil', count: 0 },
      { range: '100-200 mil', count: 0 },
      { range: '200+ mil', count: 0 }
    ];
    
    simulations.forEach(sim => {
      if (sim.rendimento_bruto < 50000) incomeRanges[0].count++;
      else if (sim.rendimento_bruto < 100000) incomeRanges[1].count++;
      else if (sim.rendimento_bruto < 200000) incomeRanges[2].count++;
      else incomeRanges[3].count++;
    });
    
    return {
      typeDistribution,
      resultDistribution,
      incomeRanges
    };
  }, [simulations]);

  if (simulations.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-md dark:bg-navy-dark">
        <CardHeader>
          <CardTitle className="dark:text-gold">Distribuição por Modelo de Declaração</CardTitle>
          <CardDescription className="dark:text-gray-300">
            Proporção de declarações com modelo completo vs simplificado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[300px]">
            {chartData && chartData.typeDistribution.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.typeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(value) => [`${value} simulações`, 'Quantidade']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-md dark:bg-navy-dark">
        <CardHeader>
          <CardTitle className="dark:text-gold">A Pagar vs Restituição</CardTitle>
          <CardDescription className="dark:text-gray-300">
            Quantidade de simulações com imposto a pagar ou a restituir
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[300px]">
            {chartData && chartData.resultDistribution.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.resultDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#FF8042" />
                    <Cell fill="#00C49F" />
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(value) => [`${value} simulações`, 'Quantidade']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-md dark:bg-navy-dark xl:col-span-2">
        <CardHeader>
          <CardTitle className="dark:text-gold">Distribuição por Faixa de Renda</CardTitle>
          <CardDescription className="dark:text-gray-300">
            Quantidade de simulações por faixa de rendimento anual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[300px]">
            {chartData && chartData.incomeRanges.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.incomeRanges}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} simulações`, 'Quantidade']} />
                  <Legend />
                  <Bar dataKey="count" name="Simulações" fill="#F5C441" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
