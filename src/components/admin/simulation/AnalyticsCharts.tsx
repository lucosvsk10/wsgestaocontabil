
import { useMemo } from "react";
import { TaxSimulation } from "@/types/taxSimulation";
import { currencyFormat } from "@/utils/taxCalculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

interface AnalyticsChartsProps {
  simulations: TaxSimulation[];
}

export const AnalyticsCharts = ({ simulations }: AnalyticsChartsProps) => {
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  
  const pieChartData = useMemo(() => {
    const aPagarCount = simulations.filter(s => s.tipo_simulacao === 'a pagar').length;
    const restituicaoCount = simulations.filter(s => s.tipo_simulacao === 'restituição').length;
    
    return [
      { name: 'A pagar', value: aPagarCount },
      { name: 'Restituição', value: restituicaoCount },
    ];
  }, [simulations]);
  
  const monthlyData = useMemo(() => {
    // Inicializa um objeto com todos os meses zerados
    const months: Record<string, number> = {};
    monthNames.forEach((month, index) => {
      months[String(index).padStart(2, '0')] = 0;
    });
    
    // Conta simulações por mês
    simulations.forEach(sim => {
      const month = new Date(sim.data_criacao).getMonth();
      const monthKey = String(month).padStart(2, '0');
      months[monthKey] = (months[monthKey] || 0) + 1;
    });
    
    // Converte para array para o gráfico
    return Object.entries(months).map(([month, count]) => ({
      month: monthNames[parseInt(month)],
      count,
    }));
  }, [simulations, monthNames]);
  
  const incomeRanges = useMemo(() => {
    const ranges = [
      { range: "Até 30k", min: 0, max: 30000, count: 0 },
      { range: "30k-60k", min: 30000, max: 60000, count: 0 },
      { range: "60k-100k", min: 60000, max: 100000, count: 0 },
      { range: "100k-150k", min: 100000, max: 150000, count: 0 },
      { range: "Acima 150k", min: 150000, max: Infinity, count: 0 },
    ];
    
    simulations.forEach(sim => {
      const range = ranges.find(
        r => sim.rendimento_bruto >= r.min && sim.rendimento_bruto < r.max
      );
      if (range) range.count++;
    });
    
    return ranges;
  }, [simulations]);
  
  const COLORS = ['#F87171', '#34D399', '#60A5FA', '#A78BFA', '#F472B6'];
  
  if (simulations.length === 0) {
    return (
      <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-md">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <p className="text-lg font-medium dark:text-white">
            Nenhum dado disponível para análise
          </p>
          <p className="text-muted-foreground dark:text-gray-400">
            Simulações de imposto ainda não foram realizadas
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg dark:text-gold">Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index === 0 ? '#ef4444' : '#10b981'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} simulações`, '']} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg dark:text-gold">Simulações por Mês</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'var(--foreground)' }}
                  />
                  <YAxis tick={{ fill: 'var(--foreground)' }} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'var(--background)', 
                      borderColor: 'var(--border)' 
                    }}
                    labelStyle={{ color: 'var(--foreground)' }}
                    formatter={(value) => [`${value} simulações`, 'Quantidade']}
                  />
                  <Bar dataKey="count" fill="#F5C441" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg dark:text-gold">Simulações por Faixa de Rendimento</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeRanges}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="range" 
                  tick={{ fill: 'var(--foreground)' }}
                />
                <YAxis tick={{ fill: 'var(--foreground)' }} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'var(--background)', 
                    borderColor: 'var(--border)' 
                  }}
                  labelStyle={{ color: 'var(--foreground)' }}
                  formatter={(value) => [`${value} simulações`, 'Quantidade']}
                />
                <Bar dataKey="count" fill="#0b1320">
                  {incomeRanges.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
