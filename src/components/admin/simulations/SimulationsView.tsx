
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Trash2, Search, Calendar, User, Calculator, Download, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { currencyFormat } from '@/utils/taxCalculations';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BaseSimulation {
  id: string;
  user_id: string | null;
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

type Simulation = TaxSimulation | INSSSimulation | ProlaboreSimulation;

export const SimulationsView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [filteredSimulations, setFilteredSimulations] = useState<Simulation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSimulation, setSelectedSimulation] = useState<Simulation | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchAllSimulations();
  }, []);

  useEffect(() => {
    const filtered = simulations.filter(sim => {
      const matchesSearch = sim.type === 'tax' 
        ? ((sim as TaxSimulation).nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (sim as TaxSimulation).email?.toLowerCase().includes(searchTerm.toLowerCase()))
        : true;
      
      const matchesTab = activeTab === 'all' || 
        (activeTab === 'tax' && sim.type === 'tax') ||
        (activeTab === 'inss' && sim.type === 'inss') ||
        (activeTab === 'prolabore' && sim.type === 'prolabore');
      
      return matchesSearch && matchesTab;
    });
    setFilteredSimulations(filtered);
  }, [searchTerm, simulations, activeTab]);

  const fetchAllSimulations = async () => {
    try {
      setIsLoading(true);
      
      // Buscar TODAS as simulações (sem filtro de usuário)
      const [taxResult, inssResult, prolaboreResult] = await Promise.all([
        supabase.from('tax_simulations').select('*').order('data_criacao', { ascending: false }),
        supabase.from('inss_simulations').select('*').order('created_at', { ascending: false }),
        supabase.from('prolabore_simulations').select('*').order('created_at', { ascending: false })
      ]);

      const allSimulations: Simulation[] = [
        ...(taxResult.data || []).map(sim => ({ ...sim, type: 'tax' as const })),
        ...(inssResult.data || []).map(sim => ({ ...sim, type: 'inss' as const })),
        ...(prolaboreResult.data || []).map(sim => ({ ...sim, type: 'prolabore' as const }))
      ];

      // Ordenar por data de criação
      allSimulations.sort((a, b) => {
        const dateA = new Date(getCreatedDate(a));
        const dateB = new Date(getCreatedDate(b));
        return dateB.getTime() - dateA.getTime();
      });

      setSimulations(allSimulations);
      setFilteredSimulations(allSimulations);
    } catch (error) {
      console.error('Erro ao carregar simulações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as simulações.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCreatedDate = (simulation: Simulation) => {
    return simulation.data_criacao || simulation.created_at || '';
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'tax': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'inss': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'prolabore': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'tax': return 'IRPF';
      case 'inss': return 'INSS';
      case 'prolabore': return 'Pró-labore';
      default: return 'Simulação';
    }
  };

  const getSimulationName = (simulation: Simulation) => {
    if (simulation.type === 'tax') {
      return (simulation as TaxSimulation).nome || 'Usuário Anônimo';
    }
    return 'Usuário Anônimo';
  };

  const getSimulationMainValue = (simulation: Simulation) => {
    switch (simulation.type) {
      case 'tax':
        return currencyFormat((simulation as TaxSimulation).imposto_estimado || 0);
      case 'inss':
        return currencyFormat((simulation as INSSSimulation).dados?.contribuicao || 0);
      case 'prolabore':
        return currencyFormat((simulation as ProlaboreSimulation).dados?.valorLiquido || 0);
      default:
        return 'N/A';
    }
  };

  const getSimulationDescription = (simulation: Simulation) => {
    switch (simulation.type) {
      case 'tax':
        const taxSim = simulation as TaxSimulation;
        return `Rend. Bruto: ${currencyFormat(taxSim.rendimento_bruto)} - Imposto: ${currencyFormat(taxSim.imposto_estimado)}`;
      case 'inss':
        const inssSim = simulation as INSSSimulation;
        return `${inssSim.dados?.categoria || 'N/A'} - ${inssSim.dados?.aliquota || 0}% - Contrib.: ${currencyFormat(inssSim.dados?.contribuicao || 0)}`;
      case 'prolabore':
        const prolaboreSim = simulation as ProlaboreSimulation;
        return `Bruto: ${currencyFormat(prolaboreSim.dados?.valorBruto || 0)} - Líquido: ${currencyFormat(prolaboreSim.dados?.valorLiquido || 0)}`;
      default:
        return '';
    }
  };

  const openDetails = (simulation: Simulation) => {
    setSelectedSimulation(simulation);
    setDetailsModalOpen(true);
  };

  const deleteSimulation = async (simulation: Simulation) => {
    if (!confirm('Deseja realmente excluir esta simulação? Esta ação não pode ser desfeita.')) {
      return;
    }

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
      
      setSimulations(prev => prev.filter(sim => sim.id !== simulation.id));
      setFilteredSimulations(prev => prev.filter(sim => sim.id !== simulation.id));
      
      toast({
        title: "Sucesso",
        description: "Simulação excluída com sucesso."
      });
    } catch (error) {
      console.error('Erro ao excluir simulação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a simulação.",
        variant: "destructive"
      });
    }
  };

  const copySimulationData = (simulation: Simulation) => {
    let texto = `Simulação ${getTypeLabel(simulation.type)} - ${formatDate(getCreatedDate(simulation))}\n`;
    texto += `===============================================\n`;
    texto += `${getSimulationName(simulation)}\n`;
    
    if (simulation.type === 'tax') {
      const taxSim = simulation as TaxSimulation;
      texto += `${taxSim.email ? `Email: ${taxSim.email}` : ''}\n`;
      texto += `${taxSim.telefone ? `Telefone: ${taxSim.telefone}` : ''}\n`;
      texto += `\nDADOS FINANCEIROS:\n`;
      texto += `Rendimento Bruto: ${currencyFormat(taxSim.rendimento_bruto)}\n`;
      texto += `INSS: ${currencyFormat(taxSim.inss)}\n`;
      texto += `Resultado: ${currencyFormat(taxSim.imposto_estimado)}\n`;
    } else {
      const dados = simulation.type === 'inss' 
        ? (simulation as INSSSimulation).dados 
        : (simulation as ProlaboreSimulation).dados;
      texto += `\nDADOS:\n${JSON.stringify(dados, null, 2)}\n`;
    }

    navigator.clipboard.writeText(texto);
    toast({
      title: "Copiado!",
      description: "Dados da simulação copiados para a área de transferência."
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Calculator className="h-12 w-12 text-[#efc349] mx-auto mb-4 animate-spin" />
          <p className="text-[#020817] dark:text-white font-extralight">Carregando simulações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl text-[#020817] dark:text-[#efc349] mb-4 font-extralight">
            Histórico de Simulações
          </h1>
          <p className="text-gray-600 dark:text-white/70 font-extralight">
            Visualize todas as simulações realizadas pelos usuários
          </p>
        </div>

        {/* Search and Stats */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
            />
          </div>
          
          <div className="flex gap-4 text-sm font-extralight">
            <div className="text-center">
              <div className="text-2xl font-extralight text-[#020817] dark:text-[#efc349]">
                {filteredSimulations.length}
              </div>
              <div className="text-gray-600 dark:text-white/70">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-extralight text-blue-600 dark:text-blue-400">
                {filteredSimulations.filter(s => s.type === 'tax').length}
              </div>
              <div className="text-gray-600 dark:text-white/70">IRPF</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-extralight text-green-600 dark:text-green-400">
                {filteredSimulations.filter(s => s.type === 'inss').length}
              </div>
              <div className="text-gray-600 dark:text-white/70">INSS</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-extralight text-purple-600 dark:text-purple-400">
                {filteredSimulations.filter(s => s.type === 'prolabore').length}
              </div>
              <div className="text-gray-600 dark:text-white/70">Pró-labore</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Filter */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="font-extralight">Todas</TabsTrigger>
          <TabsTrigger value="tax" className="font-extralight">IRPF</TabsTrigger>
          <TabsTrigger value="inss" className="font-extralight">INSS</TabsTrigger>
          <TabsTrigger value="prolabore" className="font-extralight">Pró-labore</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {/* Simulations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredSimulations.map((simulation) => (
              <Card 
                key={`${simulation.type}-${simulation.id}`}
                className="bg-white dark:bg-transparent border-gray-100 dark:border-[#efc349]/20 hover:shadow-lg dark:hover:shadow-none transition-all duration-300 hover:scale-[1.02]"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500 dark:text-white/60" />
                        <span className="text-sm font-extralight text-[#020817] dark:text-white">
                          {getSimulationName(simulation)}
                        </span>
                      </div>
                      <Badge className={`${getTypeColor(simulation.type)} font-extralight`}>
                        {getTypeLabel(simulation.type)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-white/60">
                      <Calendar className="h-3 w-3" />
                      <span className="font-extralight">{formatDate(getCreatedDate(simulation))}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Results Summary */}
                  <div className="space-y-2">
                    <div className="text-2xl font-extralight text-[#020817] dark:text-[#efc349]">
                      {getSimulationMainValue(simulation)}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-white/70 font-extralight">
                      {getSimulationDescription(simulation)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs font-extralight border-[#efc349]/30 hover:bg-[#efc349]/10"
                      onClick={() => openDetails(simulation)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Detalhes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-extralight border-blue-500/30 hover:bg-blue-500/10"
                      onClick={() => copySimulationData(simulation)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-extralight border-red-500/30 hover:bg-red-500/10 text-red-600 dark:text-red-400"
                      onClick={() => deleteSimulation(simulation)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {filteredSimulations.length === 0 && (
            <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calculator className="h-12 w-12 text-gray-400 dark:text-white/40 mb-4" />
                <h3 className="text-lg font-extralight text-[#020817] dark:text-white mb-2">
                  Nenhuma simulação encontrada
                </h3>
                <p className="text-gray-600 dark:text-white/70 text-center font-extralight">
                  {searchTerm ? 'Nenhuma simulação corresponde aos termos de busca.' : 'Ainda não há simulações registradas no sistema.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#020817] dark:text-[#efc349] font-extralight">
              Detalhes da Simulação {selectedSimulation && getTypeLabel(selectedSimulation.type)}
            </DialogTitle>
            <DialogDescription className="font-extralight text-gray-600 dark:text-white/70">
              Informações completas da simulação
            </DialogDescription>
          </DialogHeader>
          
          {selectedSimulation && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="bg-[#efc349]/10 rounded-lg p-4 border border-[#efc349]/30">
                <h3 className="font-extralight text-[#020817] dark:text-[#efc349] mb-3">Informações Básicas</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-extralight">Tipo:</span>
                    <span className="font-extralight">{getTypeLabel(selectedSimulation.type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-extralight">Usuário:</span>
                    <span className="font-extralight">{getSimulationName(selectedSimulation)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-extralight">Data:</span>
                    <span className="font-extralight">{formatDate(getCreatedDate(selectedSimulation))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-extralight">Resultado:</span>
                    <span className="font-extralight">{getSimulationMainValue(selectedSimulation)}</span>
                  </div>
                </div>
              </div>

              {/* Detailed Data */}
              <div className="bg-gray-50 dark:bg-[#020817]/50 rounded-lg p-4">
                <h3 className="font-extralight text-[#020817] dark:text-[#efc349] mb-3">Dados Detalhados</h3>
                <pre className="text-xs bg-white dark:bg-[#0b1320] p-3 rounded border overflow-auto max-h-60">
                  {JSON.stringify(
                    selectedSimulation.type === 'tax' 
                      ? selectedSimulation 
                      : (selectedSimulation as INSSSimulation | ProlaboreSimulation).dados, 
                    null, 
                    2
                  )}
                </pre>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  onClick={() => copySimulationData(selectedSimulation)}
                  className="flex-1 bg-[#020817] dark:bg-transparent border border-[#efc349] text-white dark:text-[#efc349] hover:bg-[#020817]/90 dark:hover:bg-[#efc349]/10 font-extralight"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Dados
                </Button>
                <Button 
                  onClick={() => window.print()}
                  variant="outline"
                  className="flex-1 border-[#efc349]/30 hover:bg-[#efc349]/10 font-extralight"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
