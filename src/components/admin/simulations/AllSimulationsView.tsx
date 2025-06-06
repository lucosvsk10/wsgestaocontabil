
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

interface AllSimulation {
  id: string;
  user_id: string | null;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  tipo_simulacao: string;
  data_criacao: string;
  dados: any;
  table_source: 'tax_simulations' | 'inss_simulations' | 'prolabore_simulations';
}

export const AllSimulationsView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [simulations, setSimulations] = useState<AllSimulation[]>([]);
  const [filteredSimulations, setFilteredSimulations] = useState<AllSimulation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSimulation, setSelectedSimulation] = useState<AllSimulation | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllSimulations();
  }, []);

  useEffect(() => {
    const filtered = simulations.filter(sim => 
      (sim.nome?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sim.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      sim.tipo_simulacao.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSimulations(filtered);
  }, [searchTerm, simulations]);

  const fetchAllSimulations = async () => {
    try {
      setIsLoading(true);
      
      // Buscar todas as simulações das três tabelas
      const [taxSims, inssSims, prolaboreSims] = await Promise.all([
        supabase
          .from('tax_simulations')
          .select('*')
          .order('data_criacao', { ascending: false }),
        
        supabase
          .from('inss_simulations')
          .select('*')
          .order('created_at', { ascending: false }),
          
        supabase
          .from('prolabore_simulations')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      // Processar simulações de IRPF
      const processedTaxSims: AllSimulation[] = (taxSims.data || []).map(sim => ({
        id: sim.id,
        user_id: sim.user_id,
        nome: sim.nome,
        email: sim.email,
        telefone: sim.telefone,
        tipo_simulacao: 'IRPF',
        data_criacao: sim.data_criacao,
        dados: {
          rendimento_bruto: sim.rendimento_bruto,
          inss: sim.inss,
          educacao: sim.educacao,
          saude: sim.saude,
          dependentes: sim.dependentes,
          outras_deducoes: sim.outras_deducoes,
          imposto_estimado: sim.imposto_estimado
        },
        table_source: 'tax_simulations'
      }));

      // Processar simulações de INSS
      const processedInssSims: AllSimulation[] = (inssSims.data || []).map(sim => ({
        id: sim.id,
        user_id: sim.user_id,
        nome: sim.dados?.contactData?.nome || null,
        email: sim.dados?.contactData?.email || null,
        telefone: sim.dados?.contactData?.telefone || null,
        tipo_simulacao: 'INSS',
        data_criacao: sim.created_at,
        dados: sim.dados,
        table_source: 'inss_simulations'
      }));

      // Processar simulações de Pró-labore
      const processedProlaboreSims: AllSimulation[] = (prolaboreSims.data || []).map(sim => ({
        id: sim.id,
        user_id: sim.user_id,
        nome: sim.dados?.contactData?.nome || null,
        email: sim.dados?.contactData?.email || null,
        telefone: sim.dados?.contactData?.telefone || null,
        tipo_simulacao: 'Pró-labore',
        data_criacao: sim.created_at,
        dados: sim.dados,
        table_source: 'prolabore_simulations'
      }));

      // Combinar todas as simulações e ordenar por data
      const allSimulations = [...processedTaxSims, ...processedInssSims, ...processedProlaboreSims];
      allSimulations.sort((a, b) => new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime());
      
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

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'irpf': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'inss': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'pró-labore': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getMainValue = (simulation: AllSimulation) => {
    switch (simulation.tipo_simulacao) {
      case 'IRPF':
        return currencyFormat(simulation.dados.imposto_estimado || 0);
      case 'INSS':
        return currencyFormat(simulation.dados.contribuicao || 0);
      case 'Pró-labore':
        return currencyFormat(simulation.dados.valorLiquido || 0);
      default:
        return 'N/A';
    }
  };

  const openDetails = (simulation: AllSimulation) => {
    setSelectedSimulation(simulation);
    setDetailsModalOpen(true);
  };

  const deleteSimulation = async (simulation: AllSimulation) => {
    if (!confirm('Deseja realmente excluir esta simulação? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from(simulation.table_source)
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

  const getSimulationCounts = () => {
    return {
      total: filteredSimulations.length,
      irpf: filteredSimulations.filter(s => s.tipo_simulacao === 'IRPF').length,
      inss: filteredSimulations.filter(s => s.tipo_simulacao === 'INSS').length,
      prolabore: filteredSimulations.filter(s => s.tipo_simulacao === 'Pró-labore').length
    };
  };

  const counts = getSimulationCounts();

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl text-[#020817] dark:text-[#efc349] mb-4 font-extralight">
            Todas as Simulações
          </h1>
          <p className="text-gray-600 dark:text-white/70 font-extralight">
            Visualize todas as simulações realizadas pelos usuários (IRPF, INSS e Pró-labore)
          </p>
        </div>

        {/* Search and Stats */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, email ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
            />
          </div>
          
          <div className="flex gap-4 text-sm font-extralight">
            <div className="text-center">
              <div className="text-2xl font-extralight text-[#020817] dark:text-[#efc349]">
                {counts.total}
              </div>
              <div className="text-gray-600 dark:text-white/70">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-extralight text-blue-600 dark:text-blue-400">
                {counts.irpf}
              </div>
              <div className="text-gray-600 dark:text-white/70">IRPF</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-extralight text-green-600 dark:text-green-400">
                {counts.inss}
              </div>
              <div className="text-gray-600 dark:text-white/70">INSS</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-extralight text-purple-600 dark:text-purple-400">
                {counts.prolabore}
              </div>
              <div className="text-gray-600 dark:text-white/70">Pró-labore</div>
            </div>
          </div>
        </div>
      </div>

      {/* Simulations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSimulations.map((simulation) => (
          <Card 
            key={`${simulation.table_source}-${simulation.id}`}
            className="bg-white dark:bg-transparent border-gray-100 dark:border-[#efc349]/20 hover:shadow-lg dark:hover:shadow-none transition-all duration-300 hover:scale-[1.02]"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500 dark:text-white/60" />
                    <span className="text-sm font-extralight text-[#020817] dark:text-white">
                      {simulation.nome || 'Usuário Anônimo'}
                    </span>
                  </div>
                  <Badge className={`${getTypeColor(simulation.tipo_simulacao)} font-extralight`}>
                    {simulation.tipo_simulacao.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-white/60">
                  <Calendar className="h-3 w-3" />
                  <span className="font-extralight">{formatDate(simulation.data_criacao)}</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Main Value */}
              <div className="text-center">
                <div className="text-2xl font-extralight text-[#020817] dark:text-[#efc349] mb-1">
                  {getMainValue(simulation)}
                </div>
                <div className="text-sm text-gray-600 dark:text-white/70 font-extralight">
                  {simulation.tipo_simulacao === 'IRPF' ? 'Imposto Devido' : 
                   simulation.tipo_simulacao === 'INSS' ? 'Contribuição' : 'Valor Líquido'}
                </div>
              </div>

              {/* Contact Info */}
              {(simulation.email || simulation.telefone) && (
                <div className="text-xs text-gray-500 dark:text-white/60 font-extralight">
                  {simulation.email && <p>{simulation.email}</p>}
                  {simulation.telefone && <p>{simulation.telefone}</p>}
                </div>
              )}

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

      {/* Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0b1320] border-gray-200 dark:border-[#efc349]/30">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#020817] dark:text-[#efc349] font-extralight">
              Detalhes da Simulação {selectedSimulation?.tipo_simulacao}
            </DialogTitle>
            <DialogDescription className="font-extralight text-gray-600 dark:text-white/70">
              Informações completas da simulação
            </DialogDescription>
          </DialogHeader>
          
          {selectedSimulation && (
            <div className="space-y-6 py-4">
              <div className="bg-[#efc349]/10 rounded-lg p-4 border border-[#efc349]/30">
                <h3 className="font-extralight text-[#020817] dark:text-[#efc349] mb-3">Informações Gerais</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-extralight">Tipo:</span>
                    <span className="font-extralight">{selectedSimulation.tipo_simulacao}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-extralight">Nome:</span>
                    <span className="font-extralight">{selectedSimulation.nome || 'Não informado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-extralight">Email:</span>
                    <span className="font-extralight">{selectedSimulation.email || 'Não informado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-extralight">Data:</span>
                    <span className="font-extralight">{formatDate(selectedSimulation.data_criacao)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-[#020817]/50 rounded-lg p-4">
                <h3 className="font-extralight text-[#020817] dark:text-[#efc349] mb-3">Dados da Simulação</h3>
                <pre className="text-xs text-gray-700 dark:text-white/80 font-mono whitespace-pre-wrap overflow-auto max-h-60">
                  {JSON.stringify(selectedSimulation.dados, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
