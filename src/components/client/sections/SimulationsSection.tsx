
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, Trash2, FileText, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface Simulation {
  id: string;
  tipo_simulacao: string;
  rendimento_bruto: number;
  imposto_estimado: number;
  inss: number;
  data_criacao: string;
  dependentes?: number;
  educacao?: number;
  saude?: number;
  outras_deducoes?: number;
}

export const SimulationsSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSimulations = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tax_simulations')
        .select('*')
        .eq('user_id', user.id)
        .order('data_criacao', { ascending: false });

      if (error) throw error;
      setSimulations(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar simulações:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar simulações",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSimulation = async (simulationId: string) => {
    try {
      const { error } = await supabase
        .from('tax_simulations')
        .delete()
        .eq('id', simulationId);

      if (error) throw error;

      setSimulations(prev => prev.filter(sim => sim.id !== simulationId));
      toast({
        title: "Simulação excluída",
        description: "A simulação foi removida com sucesso."
      });
    } catch (error: any) {
      console.error('Erro ao excluir simulação:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message
      });
    }
  };

  useEffect(() => {
    fetchSimulations();
  }, [user?.id]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSimulationIcon = (type: string) => {
    switch (type) {
      case 'IRPF':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'INSS':
        return <Calculator className="w-5 h-5 text-green-500" />;
      case 'Pró-labore':
        return <Calculator className="w-5 h-5 text-purple-500" />;
      default:
        return <Calculator className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSimulationBadge = (type: string) => {
    switch (type) {
      case 'IRPF':
        return <Badge variant="outline" className="font-extralight text-blue-600 border-blue-200">IRPF</Badge>;
      case 'INSS':
        return <Badge variant="outline" className="font-extralight text-green-600 border-green-200">INSS</Badge>;
      case 'Pró-labore':
        return <Badge variant="outline" className="font-extralight text-purple-600 border-purple-200">Pró-labore</Badge>;
      default:
        return <Badge variant="outline" className="font-extralight">Simulação</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#efc349]"></div>
      </div>
    );
  }

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
              Nenhuma simulação encontrada
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 font-extralight">
              Suas simulações das calculadoras aparecerão aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
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
                      <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349] flex items-center gap-2">
                        Simulação {simulation.tipo_simulacao}
                        {getSimulationBadge(simulation.tipo_simulacao)}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-extralight">
                          {formatDate(simulation.data_criacao)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSimulation(simulation.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-extralight">
                      Rendimento Bruto
                    </p>
                    <p className="font-extralight text-[#020817] dark:text-white">
                      {simulation.rendimento_bruto.toLocaleString('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      })}
                    </p>
                  </div>
                  
                  {simulation.tipo_simulacao === 'IRPF' && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-extralight">
                          INSS
                        </p>
                        <p className="font-extralight text-[#020817] dark:text-white">
                          {simulation.inss.toLocaleString('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-extralight">
                          Dependentes
                        </p>
                        <p className="font-extralight text-[#020817] dark:text-white">
                          {simulation.dependentes || 0}
                        </p>
                      </div>
                    </>
                  )}
                  
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-extralight">
                      {simulation.tipo_simulacao === 'IRPF' ? 'Imposto Devido' : 
                       simulation.tipo_simulacao === 'INSS' ? 'Contribuição INSS' : 
                       'Valor Líquido'}
                    </p>
                    <p className="font-extralight text-[#020817] dark:text-[#efc349]">
                      {simulation.imposto_estimado.toLocaleString('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
