
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Trash2, Archive, Search, Calendar, User, Calculator } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { currencyFormat } from '@/utils/taxCalculations';

interface Simulation {
  id: string;
  user_name: string | null;
  simulation_type: 'IRPF' | 'INSS' | 'Pró-labore';
  date: string;
  total_income: number;
  total_deductions: number;
  tax_due: number;
  effective_rate: number;
  details: any;
}

// Mock data - será substituído por dados reais do Supabase
const mockSimulations: Simulation[] = [
  {
    id: '1',
    user_name: 'João Silva',
    simulation_type: 'IRPF',
    date: '2024-12-20T10:30:00Z',
    total_income: 120000,
    total_deductions: 25000,
    tax_due: 15600,
    effective_rate: 13.0,
    details: {}
  },
  {
    id: '2',
    user_name: null,
    simulation_type: 'IRPF',
    date: '2024-12-19T15:45:00Z',
    total_income: 85000,
    total_deductions: 18000,
    tax_due: 8450,
    effective_rate: 9.9,
    details: {}
  }
];

export const SimulationsView: React.FC = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filteredSimulations, setFilteredSimulations] = React.useState(mockSimulations);

  React.useEffect(() => {
    const filtered = mockSimulations.filter(sim => 
      (sim.user_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      sim.simulation_type.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSimulations(filtered);
  }, [searchTerm]);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'IRPF': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'INSS': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'Pró-labore': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl text-[#020817] dark:text-[#efc349] mb-4 font-extralight">
            Simulações Fiscais
          </h1>
          <p className="text-gray-600 dark:text-white/70 font-extralight">
            Histórico de todas as simulações realizadas pelos usuários
          </p>
        </div>

        {/* Search and Stats */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
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
                {filteredSimulations.filter(s => s.simulation_type === 'IRPF').length}
              </div>
              <div className="text-gray-600 dark:text-white/70">IRPF</div>
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
                      {simulation.user_name || 'Usuário Anônimo'}
                    </span>
                  </div>
                  <Badge className={`${getTypeColor(simulation.simulation_type)} font-extralight`}>
                    {simulation.simulation_type}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-white/60">
                  <Calendar className="h-3 w-3" />
                  <span className="font-extralight">{formatDate(simulation.date)}</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Results Summary */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-gray-600 dark:text-white/70 font-extralight">Rendimentos</div>
                  <div className="text-[#020817] dark:text-white font-extralight">
                    {currencyFormat(simulation.total_income)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-600 dark:text-white/70 font-extralight">Deduções</div>
                  <div className="text-[#020817] dark:text-white font-extralight">
                    {currencyFormat(simulation.total_deductions)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-600 dark:text-white/70 font-extralight">Imposto Devido</div>
                  <div className="text-red-600 dark:text-red-400 font-extralight">
                    {currencyFormat(simulation.tax_due)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-600 dark:text-white/70 font-extralight">Alíquota Efetiva</div>
                  <div className="text-[#020817] dark:text-[#efc349] font-extralight">
                    {simulation.effective_rate.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs font-extralight border-[#efc349]/30 hover:bg-[#efc349]/10"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Detalhes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-extralight border-yellow-500/30 hover:bg-yellow-500/10"
                >
                  <Archive className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-extralight border-red-500/30 hover:bg-red-500/10 text-red-600 dark:text-red-400"
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
    </div>
  );
};
