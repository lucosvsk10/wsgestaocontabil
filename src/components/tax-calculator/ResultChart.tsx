
import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { currencyFormat } from "@/utils/taxCalculations";
import { TaxResult } from "@/types/tax-simulations";

interface ResultChartProps {
  result: TaxResult;
}

const ResultChart: React.FC<ResultChartProps> = ({ result }) => {
  // Cores para o gráfico
  const COLORS = ["#efc349", "#2f3c58", "#8aa3bd"];

  // Dados para o gráfico
  const getChartData = () => {
    return [
      { name: "Rendimento", value: result.rendimentoBruto },
      { name: "Deduções", value: result.totalDeducoes },
      { name: "Imposto", value: result.total },
    ];
  };

  return (
    <Card className="mb-8 p-4">
      <CardContent className="flex flex-col items-center">
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={getChartData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
              >
                {getChartData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => currencyFormat(Number(value))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 w-full grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-navy/70 dark:text-white/70">Rendimento Total:</p>
            <p className="font-medium">{currencyFormat(result.rendimentoBruto)}</p>
          </div>
          <div>
            <p className="text-sm text-navy/70 dark:text-white/70">Total de Deduções:</p>
            <p className="font-medium">{currencyFormat(result.totalDeducoes)}</p>
          </div>
          <div>
            <p className="text-sm text-navy/70 dark:text-white/70">Imposto Calculado:</p>
            <p className="font-medium">{currencyFormat(result.total)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultChart;
