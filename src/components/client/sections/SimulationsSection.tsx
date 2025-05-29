
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, FileText, Eye, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/hooks/client/useClientData';
import { Badge } from '@/components/ui/badge';

export const SimulationsSection = () => {
  const { user } = useAuth();
  const { simulations, fetchSimulations } = useClientData();

  useEffect(() => {
    if (user?.id) {
      fetchSimulations();
    }
  }, [user?.id, fetchSimulations]);

  const getSimulationIcon = (type: string) => {
    switch (type) {
      case 'IRPF':
        return <Calculator className="w-5 h-5" />;
      case 'INSS':
        return <FileText className="w-5 h-5" />;
      case 'Pró-labore':
        return <Eye className="w-5 h-5" />;
      default:
        return <Calculator className="w-5 h-5" />;
    }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extralight text-[#020817] dark:text-[#efc349]">
          Simulações Realizadas
        </h2>
        <Button 
          className="bg-transparent border border-[#efc349] text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight"
          onClick={() => window.open('/simulador-irpf', '_blank')}
        >
          <Calculator className="w-4 h-4 mr-2" />
          Nova Simulação
        </Button>
      </div>

      {simulations.length === 0 ? (
        <Card className="border border-[#e6e6e6] dark:border-[#efc349]/30 bg-white dark:bg-transparent">
          <CardContent className="py-12 text-center">
            <Calculator className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <p className="text-gray-600 dark:text-gray-400 font-extralight mb-4">
              Nenhuma simulação encontrada
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 font-extralight">
              Realize simulações fiscais para visualizá-las aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {simulations.map((simulation) => (
            <Card 
              key={simulation.id} 
              className="border border-[#e6e6e6] dark:border-[#efc349]/30 bg-white dark:bg-transparent hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#efc349]/10">
                      {getSimulationIcon(simulation.tipo_simulacao)}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349]">
                        {simulation.tipo_simulacao}
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-extralight">
                        {formatDate(simulation.data_criacao)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-extralight">
                    {simulation.tipo_simulacao === 'a pagar' ? 'A Pagar' : 'Restituição'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 font-extralight">Rendimento Bruto</p>
                    <p className="font-extralight text-[#020817] dark:text-white">
                      {formatCurrency(simulation.rendimento_bruto)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 font-extralight">Imposto Estimado</p>
                    <p className="font-extralight text-[#020817] dark:text-white">
                      {formatCurrency(simulation.imposto_estimado)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 font-extralight">INSS</p>
                    <p className="font-extralight text-[#020817] dark:text-white">
                      {formatCurrency(simulation.inss)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 font-extralight">Outras Deduções</p>
                    <p className="font-extralight text-[#020817] dark:text-white">
                      {formatCurrency(simulation.outras_deducoes)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1 border-[#efc349]/30 hover:bg-[#efc349]/10 font-extralight"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Detalhes
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1 border-[#efc349]/30 hover:bg-[#efc349]/10 font-extralight"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Exportar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
