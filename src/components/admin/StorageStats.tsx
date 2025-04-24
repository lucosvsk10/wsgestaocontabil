
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStorageStats, UserStorageData } from "@/hooks/useStorageStats";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export const StorageStats = () => {
  const { storageStats, isLoading, error, fetchStorageStats } = useStorageStats();

  useEffect(() => {
    fetchStorageStats();
  }, []);

  const formatSize = (size: number): string => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Colors for the chart bars
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00C49F'];

  return (
    <Card className="px-0 bg-orange-200 dark:bg-navy-dark border border-gold/20">
      <CardHeader className="rounded-full bg-orange-200 dark:bg-navy-dark">
        <CardTitle className="text-navy dark:text-gold bg-transparent text-center text-2xl font-normal">
          ESTATÍSTICAS DE ARMAZENAMENTO
        </CardTitle>
      </CardHeader>
      <CardContent className="rounded-full bg-orange-200 dark:bg-navy-dark space-y-6">
        {isLoading ? (
          <div className="flex justify-center my-8">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-red-500 text-center my-4">
            {error}
          </div>
        ) : storageStats ? (
          <div className="space-y-8">
            {/* Total storage usage */}
            <div className="text-center p-4 bg-orange-300/30 dark:bg-navy-light/30 rounded-lg">
              <h3 className="text-lg font-semibold text-navy dark:text-gold mb-2">
                Uso Total de Armazenamento
              </h3>
              <p className="text-2xl font-bold text-navy dark:text-white">
                {formatSize(storageStats.totalStorageBytes)}
              </p>
            </div>

            {/* Chart */}
            <div className="h-80 mt-6">
              <h3 className="text-lg font-semibold text-navy dark:text-gold mb-4">
                Armazenamento por Cliente
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={storageStats.userStorage}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'currentColor' }}
                    tickFormatter={(value) => value ? (value.length > 10 ? `${value.substring(0, 10)}...` : value) : 'Sem nome'}
                  />
                  <YAxis 
                    tick={{ fill: 'currentColor' }}
                    tickFormatter={(value) => formatSize(value)}
                  />
                  <Tooltip 
                    formatter={(value: any) => formatSize(value)}
                    labelFormatter={(value) => value || 'Sem nome'}
                  />
                  <Bar dataKey="sizeBytes" name="Tamanho" fill="#8884d8">
                    {storageStats.userStorage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <h3 className="text-lg font-semibold text-navy dark:text-gold mb-4">
                Detalhes por Cliente
              </h3>
              <Table>
                <TableHeader>
                  <TableRow className="border-gold/20">
                    <TableHead className="text-navy dark:text-gold font-medium uppercase tracking-wider">
                      Nome
                    </TableHead>
                    <TableHead className="text-navy dark:text-gold font-medium uppercase tracking-wider">
                      Email
                    </TableHead>
                    <TableHead className="text-navy dark:text-gold font-medium uppercase tracking-wider text-right">
                      Espaço Utilizado
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-navy dark:text-white">
                  {storageStats.userStorage.length > 0 ? (
                    storageStats.userStorage.map((user: UserStorageData) => (
                      <TableRow key={user.userId} className="border-gold/20 hover:bg-orange-300/50 dark:hover:bg-navy-light/50">
                        <TableCell>{user.name || 'Sem nome'}</TableCell>
                        <TableCell>{user.email || 'Sem email'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatSize(user.sizeBytes)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="border-gold/20">
                      <TableCell colSpan={3} className="text-center py-4 text-navy/60 dark:text-white/60">
                        Nenhum dado de armazenamento encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="text-center my-4 text-navy dark:text-white">
            Nenhum dado disponível
          </div>
        )}
      </CardContent>
    </Card>
  );
};
