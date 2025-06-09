import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, Eye, Download, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimulationDetailModal } from "./SimulationDetailModal";

interface BaseSimulation {
  id: string;
  user_id: string;
  created_at?: string;
  data_criacao?: string;
  type: 'tax' | 'inss' | 'prolabore';
}

interface TaxSimulation extends BaseSimulation {
  type: 'tax';
  nome: string | null;
  email: string | null;
  telefone: string | null;
  tipo_simulacao: string;
  rendimento_bruto: number;
  inss: number;
  educacao: number;
  saude: number;
  dependentes: number;
  outras_deducoes: number;
  imposto_estimado: number;
}

interface INSSSimulation extends BaseSimulation {
  type: 'inss';
  dados: any;
}

interface ProlaboreSimulation extends BaseSimulation {
  type: 'prolabore';
  dados: any;
}

type UserSimulation = TaxSimulation | INSSSimulation | ProlaboreSimulation;

export const SimulationsSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [simulations, setSimulations] = useState<UserSimulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedSimulation, setSelectedSimulation] = useState<UserSimulation | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchSimulations();
    
    // Subscription para atualizações em tempo real
    const channels = [
      supabase
        .channel('user_tax_simulations')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'tax_simulations',
          filter: `user_id=eq.${user?.id}`
        }, () => fetchSimulations()),
      
      supabase
        .channel('user_inss_simulations')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'inss_simulations',
          filter: `user_id=eq.${user?.id}`
        }, () => fetchSimulations()),
        
      supabase
        .channel('user_prolabore_simulations')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'prolabore_simulations',
          filter: `user_id=eq.${user?.id}`
        }, () => fetchSimulations())
    ];

    channels.forEach(channel => channel.subscribe());

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user]);

  const fetchSimulations = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      console.log("Buscando simulações para usuário:", user.id);
      
      // Buscar todas as simulações do usuário
      const [taxSims, inssSims, prolaboreSims] = await Promise.all([
        supabase
          .from('tax_simulations')
          .select('*')
          .eq('user_id', user.id)
          .order('data_criacao', { ascending: false }),
        
        supabase
          .from('inss_simulations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
          
        supabase
          .from('prolabore_simulations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      // Combinar todas as simulações com tipo identificado
      const allSimulations: UserSimulation[] = [
        ...(taxSims.data || []).map(sim => ({ ...sim, type: 'tax' as const })),
        ...(inssSims.data || []).map(sim => ({ ...sim, type: 'inss' as const })),
        ...(prolaboreSims.data || []).map(sim => ({ ...sim, type: 'prolabore' as const }))
      ];

      // Ordenar por data de criação
      allSimulations.sort((a, b) => {
        const dateA = new Date(getCreatedDate(a));
        const dateB = new Date(getCreatedDate(b));
        return dateB.getTime() - dateA.getTime();
      });

      console.log("Simulações encontradas para o usuário:", allSimulations);
      setSimulations(allSimulations);
    } catch (error) {
      console.error('Erro ao buscar simulações:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função helper para obter a data de criação
  const getCreatedDate = (simulation: UserSimulation) => {
    return simulation.data_criacao || simulation.created_at || '';
  };

  const handleDeleteSimulation = async (simulation: UserSimulation) => {
    try {
      let tableName;
      switch (simulation.type) {
        case 'tax':
          tableName = 'tax_simulations';
          break;
        case 'inss':
          tableName = 'inss_simulations';
          break;
        case 'prolabore':
          tableName = 'prolabore_simulations';
          break;
        default:
          throw new Error('Tipo de simulação não reconhecido');
      }

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', simulation.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Simulação excluída com sucesso"
      });

      fetchSimulations(); // Recarregar a lista
    } catch (error) {
      console.error('Erro ao excluir simulação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a simulação",
        variant: "destructive"
      });
    }
  };

  const handleViewDetails = (simulation: UserSimulation) => {
    setSelectedSimulation(simulation);
    setIsDetailModalOpen(true);
  };

  const handleDownloadPDF = (simulation?: UserSimulation) => {
    const sim = simulation || selectedSimulation;
    if (!sim) return;

    // Implementação básica do download de PDF - pode ser expandida no futuro
    toast({
      title: "PDF em desenvolvimento",
      description: "A funcionalidade de download de PDF será implementada em breve"
    });
    
    // Aqui você pode implementar a geração real do PDF
    console.log("Gerando PDF para simulação:", sim);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getSimulationType = (simulation: UserSimulation) => {
    switch (simulation.type) {
      case 'tax': return 'IRPF';
      case 'inss': return 'INSS';
      case 'prolabore': return 'Pró-labore';
      default: return 'Simulação';
    }
  };

  const getSimulationMainValue = (simulation: UserSimulation) => {
    switch (simulation.type) {
      case 'tax':
        return formatCurrency((simulation as TaxSimulation).imposto_estimado || 0);
      case 'inss':
        return formatCurrency((simulation as INSSSimulation).dados?.contribuicao || 0);
      case 'prolabore':
        return formatCurrency((simulation as ProlaboreSimulation).dados?.valorLiquido || 0);
      default:
        return 'N/A';
    }
  };

  const getSimulationDescription = (simulation: UserSimulation) => {
    switch (simulation.type) {
      case 'tax':
        const taxSim = simulation as TaxSimulation;
        return `Rend. Bruto: ${formatCurrency(taxSim.rendimento_bruto)} - Imposto: ${formatCurrency(taxSim.imposto_estimado)}`;
      case 'inss':
        const inssSim = simulation as INSSSimulation;
        return `${inssSim.dados?.categoria || 'N/A'} - ${inssSim.dados?.aliquota || 0}% - Contrib.: ${formatCurrency(inssSim.dados?.contribuicao || 0)}`;
      case 'prolabore':
        const prolaboreSim = simulation as ProlaboreSimulation;
        return `Bruto: ${formatCurrency(prolaboreSim.dados?.valorBruto || 0)} - Líquido: ${formatCurrency(prolaboreSim.dados?.valorLiquido || 0)}`;
      default:
        return '';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'tax': return 'bg-blue-600 hover:bg-blue-700';
      case 'inss': return 'bg-green-600 hover:bg-green-700';
      case 'prolabore': return 'bg-purple-600 hover:bg-purple-700';
      default: return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  const filteredSimulations = simulations.filter(sim => {
    if (activeTab === 'all') return true;
    return sim.type === activeTab;
  });

  if (loading) {
    return (
      <Card className="bg-[#0b1320] border-[#efc349]/20">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-[#020817] rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-[#0b1320] border-[#efc349]/20">
        <CardHeader>
          <CardTitle className="text-[#efc349] font-extralight flex items-center">
            <Calculator className="w-6 h-6 mr-2" />
            Minhas Simulações
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {simulations.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-extralight">Nenhuma simulação realizada</p>
              <div className="flex flex-col gap-2 mt-4">
                <Button 
                  className="bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]"
                  onClick={() => window.open('/simulador-irpf', '_blank')}
                >
                  Simulador IRPF
                </Button>
                <Button 
                  className="bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]"
                  onClick={() => window.open('/simulador-prolabore', '_blank')}
                >
                  Simulador Pró-labore
                </Button>
                <Button 
                  className="bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]"
                  onClick={() => window.open('/calculadora-inss', '_blank')}
                >
                  Calculadora INSS
                </Button>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-4 mb-6">
                <TabsTrigger value="all" className="font-extralight">Todas</TabsTrigger>
                <TabsTrigger value="tax" className="font-extralight">IRPF</TabsTrigger>
                <TabsTrigger value="inss" className="font-extralight">INSS</TabsTrigger>
                <TabsTrigger value="prolabore" className="font-extralight">Pró-labore</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                <div className="space-y-4">
                  {filteredSimulations.map((simulation, index) => (
                    <motion.div
                      key={`${simulation.type}-${simulation.id}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="bg-[#020817] border border-[#efc349]/20 rounded-lg p-4 hover:border-[#efc349]/40 transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white text-lg">
                              {getSimulationType(simulation)}
                            </h3>
                            <Badge className={`${getTypeColor(simulation.type)} text-white`}>
                              Concluída
                            </Badge>
                          </div>
                          <p className="text-gray-400 font-extralight text-sm">
                            {new Date(getCreatedDate(simulation)).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteSimulation(simulation)}
                          className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="mb-4">
                        <p className="text-white font-medium text-xl mb-2">
                          {getSimulationMainValue(simulation)}
                        </p>
                        <p className="text-gray-300 text-sm">
                          {getSimulationDescription(simulation)}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-[#efc349]/30 text-[#efc349] hover:bg-[#efc349]/10"
                          onClick={() => handleViewDetails(simulation)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver detalhes
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-[#efc349]/30 text-[#efc349] hover:bg-[#efc349]/10"
                          onClick={() => handleDownloadPDF(simulation)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Baixar PDF
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <SimulationDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        simulation={selectedSimulation}
        onDownload={() => handleDownloadPDF()}
      />
    </>
  );
};
