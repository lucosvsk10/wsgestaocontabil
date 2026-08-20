import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Trash2, Search, Calculator, Download, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { currencyFormat } from '@/utils/taxCalculations';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';

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
  dados: SimulationData;
}

interface ProlaboreSimulation extends BaseSimulation {
  type: 'prolabore';
  dados: SimulationData;
}

interface SimulationData {
  categoria?: string;
  aliquota?: number;
  contribuicao?: number;
  valorBruto?: number;
  valorLiquido?: number;
  [key: string]: unknown;
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
  const { user, userData } = useAuth();

  // A assinatura em tempo real deve ser criada apenas uma vez durante a montagem.
  useEffect(() => {
    fetchAllSimulations();
    
    // Setup realtime subscription for all simulation tables
    const channels = [
      supabase
        .channel('tax-simulations-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'tax_simulations'
        }, () => {
          console.log('Tax simulations changed, refreshing...');
          fetchAllSimulations();
        }),
      
      supabase
        .channel('inss-simulations-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'inss_simulations'
        }, () => {
          console.log('INSS simulations changed, refreshing...');
          fetchAllSimulations();
        }),
      
      supabase
        .channel('prolabore-simulations-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'prolabore_simulations'
        }, () => {
          console.log('Prolabore simulations changed, refreshing...');
          fetchAllSimulations();
        })
    ];

    channels.forEach(channel => channel.subscribe());

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      
      console.log('Buscando todas as simulações como administrador...');
      console.log('Usuário atual:', user?.id);
      console.log('Dados do usuário:', userData);
      
      // Buscar simulações de IRPF com logging detalhado
      console.log('Executando query para tax_simulations...');
      const { data: taxData, error: taxError } = await supabase
        .from('tax_simulations')
        .select('*')
        .order('data_criacao', { ascending: false });
      
      if (taxError) {
        console.error('Erro ao buscar simulações de IRPF:', taxError);
        console.error('Detalhes do erro:', taxError.message, taxError.details);
      } else {
        console.log('Simulações de IRPF encontradas:', taxData?.length || 0);
        console.log('Primeiras 3 simulações IRPF:', taxData?.slice(0, 3));
      }

      // Buscar simulações de INSS
      const { data: inssData, error: inssError } = await supabase
        .from('inss_simulations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (inssError) {
        console.error('Erro ao buscar simulações de INSS:', inssError);
      } else {
        console.log('Simulações de INSS encontradas:', inssData?.length || 0);
      }

      // Buscar simulações de Pró-labore
      const { data: prolaboreData, error: prolaboreError } = await supabase
        .from('prolabore_simulations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (prolaboreError) {
        console.error('Erro ao buscar simulações de Pró-labore:', prolaboreError);
      } else {
        console.log('Simulações de Pró-labore encontradas:', prolaboreData?.length || 0);
      }

      // Combinar todas as simulações
      const allSimulations: Simulation[] = [
        ...(taxData || []).map(sim => ({ ...sim, type: 'tax' as const })),
        ...(inssData || []).map(sim => ({ ...sim, type: 'inss' as const })),
        ...(prolaboreData || []).map(sim => ({ ...sim, type: 'prolabore' as const }))
      ];

      console.log('Total de simulações encontradas:', allSimulations.length);
      console.log('Simulações por tipo:', {
        tax: allSimulations.filter(s => s.type === 'tax').length,
        inss: allSimulations.filter(s => s.type === 'inss').length,
        prolabore: allSimulations.filter(s => s.type === 'prolabore').length
      });

      // Ordenar por data de criação
      allSimulations.sort((a, b) => {
        const dateA = new Date(getCreatedDate(a));
        const dateB = new Date(getCreatedDate(b));
        return dateB.getTime() - dateA.getTime();
      });

      setSimulations(allSimulations);
      setFilteredSimulations(allSimulations);
      
      // Se não há simulações, mostrar mensagem informativa
      if (allSimulations.length === 0) {
        console.log('Nenhuma simulação encontrada. Verificando políticas RLS...');
        toast({
          title: "Informação",
          description: "Nenhuma simulação encontrada no sistema. Verifique se há simulações criadas pelos usuários.",
          duration: 5000
        });
      }
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
      case 'tax': {
        const taxSim = simulation as TaxSimulation;
        return `Rend. Bruto: ${currencyFormat(taxSim.rendimento_bruto)} - Imposto: ${currencyFormat(taxSim.imposto_estimado)}`;
      }
      case 'inss': {
        const inssSim = simulation as INSSSimulation;
        return `${inssSim.dados?.categoria || 'N/A'} - ${inssSim.dados?.aliquota || 0}% - Contrib.: ${currencyFormat(inssSim.dados?.contribuicao || 0)}`;
      }
      case 'prolabore': {
        const prolaboreSim = simulation as ProlaboreSimulation;
        return `Bruto: ${currencyFormat(prolaboreSim.dados?.valorBruto || 0)} - Líquido: ${currencyFormat(prolaboreSim.dados?.valorLiquido || 0)}`;
      }
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
    <div className="admin-page">
      <header className="admin-page-header"><div><p className="admin-eyebrow">Consultas e cálculos</p><h1 className="admin-title">Histórico de simulações</h1><p className="admin-subtitle">Consulte as simulações realizadas pelos usuários e acesse os dados usados em cada cálculo.</p></div></header>

      <section className="admin-kpi-grid">
        <div className="admin-kpi"><p className="admin-kpi-label">Total</p><p className="admin-kpi-value">{simulations.length}</p><p className="admin-kpi-meta">Simulações registradas</p></div>
        <div className="admin-kpi"><p className="admin-kpi-label">IRPF</p><p className="admin-kpi-value">{simulations.filter(s => s.type === 'tax').length}</p><p className="admin-kpi-meta">Imposto de renda</p></div>
        <div className="admin-kpi"><p className="admin-kpi-label">INSS</p><p className="admin-kpi-value">{simulations.filter(s => s.type === 'inss').length}</p><p className="admin-kpi-meta">Contribuição previdenciária</p></div>
        <div className="admin-kpi"><p className="admin-kpi-label">Pró-labore</p><p className="admin-kpi-value">{simulations.filter(s => s.type === 'prolabore').length}</p><p className="admin-kpi-meta">Remuneração dos sócios</p></div>
      </section>

      {/* Tabs Filter */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="admin-surface w-full">
        <div className="flex flex-col gap-3 border-b border-[var(--admin-line)] p-3 sm:flex-row sm:items-center">
          <div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-muted)]" /><Input placeholder="Buscar por nome ou e-mail" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-9 border-[var(--admin-line)] bg-transparent pl-10 shadow-none" /></div>
        <TabsList className="grid h-9 w-full grid-cols-4 rounded-md bg-[var(--admin-canvas)] p-1 sm:w-[420px]">
          <TabsTrigger value="all" className="rounded text-xs data-[state=active]:bg-[var(--admin-panel)] data-[state=active]:text-blue-600">Todas</TabsTrigger>
          <TabsTrigger value="tax" className="rounded text-xs data-[state=active]:bg-[var(--admin-panel)] data-[state=active]:text-blue-600">IRPF</TabsTrigger>
          <TabsTrigger value="inss" className="rounded text-xs data-[state=active]:bg-[var(--admin-panel)] data-[state=active]:text-blue-600">INSS</TabsTrigger>
          <TabsTrigger value="prolabore" className="rounded text-xs data-[state=active]:bg-[var(--admin-panel)] data-[state=active]:text-blue-600">Pró-labore</TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value={activeTab} className="m-0">
          <div className="admin-table-wrap"><table className="admin-data-table"><thead><tr><th>Usuário</th><th>Tipo</th><th>Resultado</th><th>Descrição</th><th>Data e hora</th><th className="text-right">Ações</th></tr></thead><tbody>
            {filteredSimulations.length > 0 ? filteredSimulations.map(simulation => <tr key={`${simulation.type}-${simulation.id}`}><td className="font-semibold">{getSimulationName(simulation)}</td><td><span className="admin-status admin-status-blue">{getTypeLabel(simulation.type)}</span></td><td className="whitespace-nowrap font-semibold tabular-nums">{getSimulationMainValue(simulation)}</td><td className="max-w-[320px] text-[var(--admin-muted)]"><span className="block truncate">{getSimulationDescription(simulation)}</span></td><td className="whitespace-nowrap text-[var(--admin-muted)]">{formatDate(getCreatedDate(simulation))}</td><td><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetails(simulation)} aria-label="Detalhes"><Eye className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copySimulationData(simulation)} aria-label="Copiar"><Copy className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30" onClick={() => deleteSimulation(simulation)} aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button></div></td></tr>) : <tr><td colSpan={6}><div className="admin-empty"><strong className="text-sm text-[var(--admin-ink)]">Nenhuma simulação encontrada</strong><span className="mt-1 text-xs">{searchTerm ? 'Revise os termos da busca.' : 'As novas simulações aparecerão nesta tabela.'}</span></div></td></tr>}
          </tbody></table></div>
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
