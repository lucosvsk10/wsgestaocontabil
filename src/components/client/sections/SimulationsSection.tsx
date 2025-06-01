
import { useClientData } from "@/hooks/client/useClientData";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Calculator, TrendingUp, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";

export const SimulationsSection = () => {
  const { simulations, fetchSimulations, isLoading } = useClientData();

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#efc349]"></div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-r from-[#efc349] to-[#d4a017] rounded-xl">
          <Calculator className="w-6 h-6 text-[#0b1320]" />
        </div>
        <h2 className="text-2xl font-light text-[#efc349] tracking-wide">
          MINHAS SIMULAÇÕES
        </h2>
      </div>

      {simulations.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="border border-[#efc349]/20 bg-[#1a2633]/80 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Calculator className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                Nenhuma simulação encontrada
              </h3>
              <p className="text-gray-400 text-center">
                Suas simulações de IRPF, INSS e Pró-labore aparecerão aqui
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {simulations.map((simulation, index) => (
            <motion.div key={simulation.id} variants={itemVariants}>
              <Card className="border border-[#efc349]/20 bg-[#1a2633]/80 backdrop-blur-sm hover:shadow-lg hover:border-[#efc349]/40 transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium text-[#efc349] flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      {simulation.tipo_simulacao}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs border-gray-500 text-gray-300">
                      {new Date(simulation.data_criacao).toLocaleDateString('pt-BR')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Rendimento Bruto</p>
                      <p className="font-medium text-white">
                        {formatCurrency(simulation.rendimento_bruto)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Imposto Estimado</p>
                      <p className="font-medium text-green-400">
                        {formatCurrency(simulation.imposto_estimado)}
                      </p>
                    </div>
                  </div>
                  
                  {simulation.nome && (
                    <div>
                      <p className="text-sm text-gray-400">Nome</p>
                      <p className="font-medium text-white">{simulation.nome}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 pt-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-400">
                      {new Date(simulation.data_criacao).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
