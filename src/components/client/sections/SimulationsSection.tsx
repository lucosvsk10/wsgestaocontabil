import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calculator, Eye, Download, Trash2, Building2, CreditCard } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
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

      const allSimulations: UserSimulation[] = [
        ...(taxSims.data || []).map(sim => ({ ...sim, type: 'tax' as const })),
        ...(inssSims.data || []).map(sim => ({ ...sim, type: 'inss' as const })),
        ...(prolaboreSims.data || []).map(sim => ({ ...sim, type: 'prolabore' as const }))
      ];

      allSimulations.sort((a, b) => {
        const dateA = new Date(getCreatedDate(a));
        const dateB = new Date(getCreatedDate(b));
        return dateB.getTime() - dateA.getTime();
      });

      setSimulations(allSimulations);
    } catch (error) {
      console.error('Erro ao buscar simulações:', error);
    } finally {
      setLoading(false);
    }
  };

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

      fetchSimulations();
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

    toast({
      title: "PDF em desenvolvimento",
      description: "A funcionalidade de download de PDF será implementada em breve"
    });
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
        return `Rend: ${formatCurrency(taxSim.rendimento_bruto)} • Imposto: ${formatCurrency(taxSim.imposto_estimado)}`;
      case 'inss':
        const inssSim = simulation as INSSSimulation;
        return `${inssSim.dados?.categoria || 'N/A'} • ${inssSim.dados?.aliquota || 0}%`;
      case 'prolabore':
        const prolaboreSim = simulation as ProlaboreSimulation;
        return `Bruto: ${formatCurrency(prolaboreSim.dados?.valorBruto || 0)}`;
      default:
        return '';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'tax': return Calculator;
      case 'inss': return CreditCard;
      case 'prolabore': return Building2;
      default: return Calculator;
    }
  };

  const filteredSimulations = simulations.filter(sim => {
    if (activeTab === 'all') return true;
    return sim.type === activeTab;
  });

  const tabs = [
    { id: 'all', label: 'Todas' },
    { id: 'tax', label: 'IRPF' },
    { id: 'inss', label: 'INSS' },
    { id: 'prolabore', label: 'Pró-labore' }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-foreground/5 animate-pulse" />
          <div className="h-6 w-32 mx-auto bg-foreground/5 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-foreground/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        {/* Header minimalista */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-foreground/5 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-light text-foreground">Simulações</h1>
          <p className="text-sm text-muted-foreground">
            Suas simulações de impostos
          </p>
        </div>

        {simulations.length === 0 ? (
          <div className="text-center py-12 space-y-6">
            <p className="text-sm text-muted-foreground">
              Nenhuma simulação realizada ainda
            </p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <a 
                href="/simulador-irpf" 
                target="_blank"
                className="py-2.5 px-4 rounded-lg text-sm font-medium bg-foreground/5 hover:bg-foreground/10 text-foreground border border-border/50 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                Simulador IRPF
              </a>
              <a 
                href="/simulador-prolabore" 
                target="_blank"
                className="py-2.5 px-4 rounded-lg text-sm font-medium bg-foreground/5 hover:bg-foreground/10 text-foreground border border-border/50 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                Simulador Pró-labore
              </a>
              <a 
                href="/calculadora-inss" 
                target="_blank"
                className="py-2.5 px-4 rounded-lg text-sm font-medium bg-foreground/5 hover:bg-foreground/10 text-foreground border border-border/50 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Calculadora INSS
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs como texto simples */}
            <div className="flex gap-4 text-sm border-b border-border/30 pb-3">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`transition-colors ${
                    activeTab === tab.id 
                      ? "text-foreground font-medium" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Contagem */}
            <p className="text-xs text-muted-foreground">
              {filteredSimulations.length} simulação{filteredSimulations.length !== 1 ? 'ões' : ''}
            </p>

            {/* Lista de simulações */}
            <div className="space-y-1">
              {filteredSimulations.map((simulation, index) => {
                const Icon = getTypeIcon(simulation.type);
                return (
                  <motion.div
                    key={`${simulation.type}-${simulation.id}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className="group py-4 px-4 rounded-lg transition-all duration-200 hover:bg-foreground/5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-foreground">
                              {getSimulationType(simulation)}
                            </h3>
                            <span className="text-lg font-light text-foreground">
                              {getSimulationMainValue(simulation)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {getSimulationDescription(simulation)} • {new Date(getCreatedDate(simulation)).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleViewDetails(simulation)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-all duration-200"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDownloadPDF(simulation)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-all duration-200"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteSimulation(simulation)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </motion.div>

      <SimulationDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        simulation={selectedSimulation}
        onDownload={() => handleDownloadPDF()}
      />
    </>
  );
};
