
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, ExternalLink, Eye, FileText } from 'lucide-react';
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getSimulationTypeLabel = (type: string) => {
    const types = {
      'irpf': 'IRPF',
      'inss': 'INSS',
      'prolabore': 'Pró-labore'
    };
    return types[type as keyof typeof types] || type;
  };

  const getSimulationIcon = (type: string) => {
    switch (type) {
      case 'irpf':
        return <FileText className="w-5 h-5 text-[#efc349]" />;
      case 'inss':
        return <Calculator className="w-5 h-5 text-[#efc349]" />;
      case 'prolabore':
        return <ExternalLink className="w-5 h-5 text-[#efc349]" />;
      default:
        return <Calculator className="w-5 h-5 text-[#efc349]" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extralight text-[#020817] dark:text-[#efc349]">
          Simulações Realizadas
        </h2>
        <Badge variant="outline" className="font-extralight">
          {simulations.length} {simulations.length === 1 ? 'simulação' : 'simulações'}
        </Badge>
      </div>

      {simulations.length === 0 ? (
        <Card className="border border-[#e6e6e6] dark:border-[#efc349]/30 bg-white dark:bg-transparent">
          <CardContent className="py-12 text-center">
            <Calculator className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <p className="text-gray-600 dark:text-gray-400 font-extralight mb-2">
              Nenhuma simulação realizada
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 font-extralight">
              Suas simulações de impostos aparecerão aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {simulations.map((simulation) => (
            <Card 
              key={simulation.id} 
              className="border border-[#e6e6e6] dark:border-[#efc349]/30 bg-white dark:bg-transparent transition-all hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#efc349]/10">
                      {getSimulationIcon(simulation.tipo_simulacao)}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349]">
                        Simulação de {getSimulationTypeLabel(simulation.tipo_simulacao)}
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-extralight">
                        {formatDate(simulation.data_criacao)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-extralight">
                    {getSimulationTypeLabel(simulation.tipo_simulacao)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 font-extralight">Rendimento Bruto:</span>
                    <p className="font-extralight text-[#020817] dark:text-white">
                      {formatCurrency(simulation.rendimento_bruto)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 font-extralight">INSS:</span>
                    <p className="font-extralight text-[#020817] dark:text-white">
                      {formatCurrency(simulation.inss)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 font-extralight">Imposto Estimado:</span>
                    <p className="font-extralight text-[#020817] dark:text-white">
                      {formatCurrency(simulation.imposto_estimado)}
                    </p>
                  </div>
                </div>

                {simulation.dependentes > 0 && (
                  <div className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400 font-extralight">Dependentes:</span>
                    <p className="font-extralight text-[#020817] dark:text-white">
                      {simulation.dependentes}
                    </p>
                  </div>
                )}

                <Button 
                  variant="outline"
                  className="w-full border-[#efc349] text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalhes
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
