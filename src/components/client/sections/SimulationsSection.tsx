
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Calculator } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TaxSimulation } from '@/types/client';
import { useClientData } from '@/hooks/client/useClientData';

export const SimulationsSection = () => {
  const { simulations, fetchSimulations, isLoading } = useClientData();
  const [selectedSimulation, setSelectedSimulation] = useState<TaxSimulation | null>(null);

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  const getSimulationTypeLabel = (type: string) => {
    const types = {
      'irpf': 'Imposto de Renda PF',
      'inss': 'INSS',
      'prolabore': 'Pró-labore'
    };
    return types[type as keyof typeof types] || type;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
        <CardHeader>
          <CardTitle className="flex items-center text-[#020817] dark:text-[#efc349] font-extralight text-xl">
            <Calculator className="mr-2 h-5 w-5" />
            Simulações Realizadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {simulations.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 font-extralight">
              Nenhuma simulação encontrada
            </div>
          ) : (
            <div className="space-y-4">
              {simulations.map((simulation) => (
                <div
                  key={simulation.id}
                  className="p-4 rounded-lg border border-gray-200 dark:border-[#efc349]/30 bg-gray-50 dark:bg-[#0b1320]/50"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-extralight text-[#020817] dark:text-white">
                        {getSimulationTypeLabel(simulation.tipo_simulacao)}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 font-extralight">
                        {formatDate(simulation.data_criacao)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 font-extralight">
                        Resultado: {formatCurrency(simulation.imposto_estimado)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSimulation(simulation)}
                      className="bg-[#020817] border-[#efc349] text-[#efc349] hover:bg-[#efc349] hover:text-[#020817] font-extralight"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedSimulation} onOpenChange={() => setSelectedSimulation(null)}>
        <DialogContent className="bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#020817] dark:text-[#efc349] font-extralight">
              Detalhes da Simulação
            </DialogTitle>
          </DialogHeader>
          {selectedSimulation && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-300 font-extralight">Tipo</label>
                  <p className="text-[#020817] dark:text-white font-extralight">
                    {getSimulationTypeLabel(selectedSimulation.tipo_simulacao)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-300 font-extralight">Data</label>
                  <p className="text-[#020817] dark:text-white font-extralight">
                    {formatDate(selectedSimulation.data_criacao)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-300 font-extralight">Rendimento Bruto</label>
                  <p className="text-[#020817] dark:text-white font-extralight">
                    {formatCurrency(selectedSimulation.rendimento_bruto)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-300 font-extralight">Imposto Estimado</label>
                  <p className="text-[#020817] dark:text-white font-extralight">
                    {formatCurrency(selectedSimulation.imposto_estimado)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-300 font-extralight">INSS</label>
                  <p className="text-[#020817] dark:text-white font-extralight">
                    {formatCurrency(selectedSimulation.inss)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-300 font-extralight">Dependentes</label>
                  <p className="text-[#020817] dark:text-white font-extralight">
                    {selectedSimulation.dependentes}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-300 font-extralight">Gastos com Saúde</label>
                  <p className="text-[#020817] dark:text-white font-extralight">
                    {formatCurrency(selectedSimulation.saude)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-300 font-extralight">Gastos com Educação</label>
                  <p className="text-[#020817] dark:text-white font-extralight">
                    {formatCurrency(selectedSimulation.educacao)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
