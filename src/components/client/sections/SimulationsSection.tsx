
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, Eye, FileText, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TaxSimulation } from "@/types/client";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const SimulationsSection = () => {
  const { user } = useAuth();
  const [simulations, setSimulations] = useState<TaxSimulation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSimulations();
  }, [user]);

  const fetchSimulations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('tax_simulations')
        .select('*')
        .eq('user_id', user.id)
        .order('data_criacao', { ascending: false });

      if (error) throw error;
      setSimulations(data || []);
    } catch (error) {
      console.error('Erro ao buscar simulações:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getSimulationType = (tipo: string) => {
    switch (tipo) {
      case 'irpf': return 'IRPF';
      case 'inss': return 'INSS';
      case 'prolabore': return 'Pró-labore';
      default: return tipo;
    }
  };

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
            <Button 
              className="mt-4 bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]"
              onClick={() => window.open('/simulador-irpf', '_blank')}
            >
              Fazer primeira simulação
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {simulations.map((simulation, index) => (
              <motion.div
                key={simulation.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-[#020817] border border-[#efc349]/20 rounded-lg p-4 hover:border-[#efc349]/40 transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-white text-lg">
                      {getSimulationType(simulation.tipo_simulacao)}
                    </h3>
                    <p className="text-gray-400 font-extralight">
                      {new Date(simulation.data_criacao).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Badge className="bg-green-600 hover:bg-green-700 text-white">
                    Concluída
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-400">Rendimento Bruto:</span>
                    <p className="text-white font-medium">
                      {formatCurrency(simulation.rendimento_bruto)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">INSS:</span>
                    <p className="text-white font-medium">
                      {formatCurrency(simulation.inss)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Dependentes:</span>
                    <p className="text-white font-medium">{simulation.dependentes}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Imposto Estimado:</span>
                    <p className="text-white font-medium">
                      {formatCurrency(simulation.imposto_estimado)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-[#efc349]/30 text-[#efc349] hover:bg-[#efc349]/10"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Ver detalhes
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-[#efc349]/30 text-[#efc349] hover:bg-[#efc349]/10"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Baixar PDF
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
