import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['#F5C441', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export const StorageDistributionChart = () => {
  const [data, setData] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategoryData = async () => {
      try {
        // Buscar documentos com suas categorias
        const { data: documents, error: docsError } = await supabase
          .from('documents')
          .select('size, category, document_categories(name)');

        if (docsError) {
          console.error('Erro ao buscar documentos:', docsError);
          setIsLoading(false);
          return;
        }

        // Agrupar por categoria
        const categoryMap: Record<string, number> = {};
        let totalSize = 0;

        documents?.forEach((doc: any) => {
          if (doc.size) {
            const categoryName = doc.document_categories?.name || 'Sem categoria';
            categoryMap[categoryName] = (categoryMap[categoryName] || 0) + doc.size;
            totalSize += doc.size;
          }
        });

        // Converter para array e calcular porcentagens
        const chartData: CategoryData[] = Object.entries(categoryMap)
          .map(([name, size], index) => ({
            name,
            value: Math.round((size / totalSize) * 100 * 100) / 100, // Porcentagem com 2 decimais
            color: COLORS[index % COLORS.length]
          }))
          .sort((a, b) => b.value - a.value); // Ordenar do maior para o menor

        setData(chartData);
      } catch (error) {
        console.error('Erro ao processar dados de categoria:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategoryData();
  }, []);

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Carregando distribuição...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Nenhum documento encontrado</p>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => [`${value}%`, 'Uso']}
            contentStyle={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: '8px'
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
