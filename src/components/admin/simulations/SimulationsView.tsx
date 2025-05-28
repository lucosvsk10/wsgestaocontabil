
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Trash2, Archive, Search, Calendar, User, Calculator, Download, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { currencyFormat } from '@/utils/taxCalculations';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Simulation {
  id: string;
  user_id: string | null;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  tipo_simulacao: string;
  data_criacao: string;
  rendimento_bruto: number;
  inss: number;
  educacao: number;
  saude: number;
  dependentes: number;
  outras_deducoes: number;
  imposto_estimado: number;
}

export const SimulationsView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [filteredSimulations, setFilteredSimulations] = useState<Simulation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSimulation, setSelectedSimulation] = useState<Simulation | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSimulations();
  }, []);

  useEffect(() => {
    const filtered = simulations.filter(sim => 
      (sim.nome?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sim.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      sim.tipo_simulacao.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSimulations(filtered);
  }, [searchTerm, simulations]);

  const fetchSimulations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('tax_simulations')
        .select('*')
        .order('data_criacao', { ascending: false });
      
      if (error) throw error;
      
      setSimulations(data || []);
      setFilteredSimulations(data || []);
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

  const openDetails = (simulation: Simulation) => {
    setSelectedSimulation(simulation);
    setDetailsModalOpen(true);
  };

  const copySimulationData = (simulation: Simulation) => {
    const totalDeducoes = simulation.inss + simulation.educacao + simulation.saude + 
                         (simulation.dependentes * 2275.08) + simulation.outras_deducoes;

    const texto = `
Simulação ${simulation.tipo_simulacao.toUpperCase()} - ${formatDate(simulation.data_criacao)}
===============================================
${simulation.nome ? `Nome: ${simulation.nome}` : 'Usuário Anônimo'}
${simulation.email ? `Email: ${simulation.email}` : ''}
${simulation.telefone ? `Telefone: ${simulation.telefone}` : ''}

DADOS FINANCEIROS:
Rendimento Bruto: ${currencyFormat(simulation.rendimento_bruto)}
INSS: ${currencyFormat(simulation.inss)}
Educação: ${currencyFormat(simulation.educacao)}
Saúde: ${currencyFormat(simulation.saude)}
Dependentes: ${simulation.dependentes} (${currencyFormat(simulation.dependentes * 2275.08)})
Outras Deduções: ${currencyFormat(simulation.outras_deducoes)}
Total de Deduções: ${currencyFormat(totalDeducoes)}

RESULTADO:
${simulation.tipo_simulacao === 'IRPF' ? 'Imposto' : 'Contribuição'}: ${currencyFormat(simulation.imposto_estimado)}
    `;

    navigator.clipboard.writeText(texto);
    toast({
      title: "Copiado!",
      description: "Dados da simulação copiados para a área de transferência."
    });
  };

  const deleteSimulation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tax_simulations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setSimulations(prev => prev.filter(sim => sim.id !== id));
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
              placeholder="Buscar por nome, email ou tipo..."
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
                {filteredSimulations.filter(s => s.tipo_simulacao.toLowerCase() === 'irpf').length}
              </div>
              <div className="text-gray-600 dark:text-white/70">IRPF</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-extralight text-green-600 dark:text-green-400">
                {filteredSimulations.filter(s => s.tipo_simulacao.toLowerCase() === 'inss').length}
              </div>
              <div className="text-gray-600 dark:text-white/70">INSS</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-extralight text-purple-600 dark:text-purple-400">
                {filteredSimulations.filter(s => s.tipo_simulacao.toLowerCase() === 'pró-labore').length}
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
            key={simulation.id} 
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
              {/* Results Summary */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-gray-600 dark:text-white/70 font-extralight">Rendimentos</div>
                  <div className="text-[#020817] dark:text-white font-extralight">
                    {currencyFormat(simulation.rendimento_bruto)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-600 dark:text-white/70 font-extralight">Resultado</div>
                  <div className="text-[#020817] dark:text-[#efc349] font-extralight">
                    {currencyFormat(simulation.imposto_estimado)}
                  </div>
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
                  className="h-8 text-xs font-extralight border-blue-500/30 hover:bg-blue-500/10"
                  onClick={() => copySimulationData(simulation)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-extralight border-red-500/30 hover:bg-red-500/10 text-red-600 dark:text-red-400"
                  onClick={() => deleteSimulation(simulation.id)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#020817] dark:text-[#efc349] font-extralight">
              Detalhes da Simulação
            </DialogTitle>
            <DialogDescription className="font-extralight">
              Informações completas da simulação
            </DialogDescription>
          </DialogHeader>
          
          {selectedSimulation && (
            <div className="space-y-6 py-4">
              {/* User Info */}
              <div className="bg-[#efc349]/10 rounded-lg p-4 border border-[#efc349]/30">
                <h3 className="font-extralight text-[#020817] dark:text-[#efc349] mb-3">Informações do Usuário</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-extralight">Nome:</span>
                    <span className="font-extralight">{selectedSimulation.nome || 'Não informado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-extralight">Email:</span>
                    <span className="font-extralight">{selectedSimulation.email || 'Não informado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-extralight">Telefone:</span>
                    <span className="font-extralight">{selectedSimulation.telefone || 'Não informado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-extralight">Data:</span>
                    <span className="font-extralight">{formatDate(selectedSimulation.data_criacao)}</span>
                  </div>
                </div>
              </div>

              {/* Financial Data */}
              <div className="bg-gray-50 dark:bg-[#020817]/50 rounded-lg p-4">
                <h3 className="font-extralight text-[#020817] dark:text-[#efc349] mb-3">Dados Financeiros</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-extralight">Rendimento Bruto:</span>
                    <span className="font-extralight">{currencyFormat(selectedSimulation.rendimento_bruto)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-extralight">INSS:</span>
                    <span className="font-extralight">{currencyFormat(selectedSimulation.inss)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-extralight">Educação:</span>
                    <span className="font-extralight">{currencyFormat(selectedSimulation.educacao)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-extralight">Saúde:</span>
                    <span className="font-extralight">{currencyFormat(selectedSimulation.saude)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-extralight">Dependentes:</span>
                    <span className="font-extralight">{selectedSimulation.dependentes} ({currencyFormat(selectedSimulation.dependentes * 2275.08)})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-extralight">Outras Deduções:</span>
                    <span className="font-extralight">{currencyFormat(selectedSimulation.outras_deducoes)}</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-[#efc349]/30 pt-2">
                    <div className="flex justify-between text-lg">
                      <span className="font-extralight text-[#020817] dark:text-[#efc349]">
                        {selectedSimulation.tipo_simulacao === 'IRPF' ? 'Imposto' : 'Contribuição'}:
                      </span>
                      <span className="font-extralight text-[#020817] dark:text-[#efc349]">
                        {currencyFormat(selectedSimulation.imposto_estimado)}
                      </span>
                    </div>
                  </div>
                </div>
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
