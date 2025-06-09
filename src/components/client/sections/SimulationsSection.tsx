
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, TrendingUp, FileText, DollarSign, Plus } from "lucide-react";
import { Link } from "react-router-dom";

export const SimulationsSection = () => {
  const simulations = [
    {
      title: "Simulador de Tributos",
      description: "Calcule impostos para diferentes regimes tributários",
      icon: Calculator,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      link: "/tax-calculator"
    },
    {
      title: "Simulador de INSS",
      description: "Calcule contribuições previdenciárias",
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      link: "/inss-calculator"
    },
    {
      title: "Simulador de Pró-labore",
      description: "Calcule descontos do pró-labore",
      icon: DollarSign,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      link: "/prolabore-calculator"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header da seção */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#efc349]/10 dark:bg-[#efc349]/20 rounded-lg flex items-center justify-center">
            <Calculator className="w-5 h-5 text-[#efc349]" />
          </div>
          <div>
            <h2 className="text-2xl font-extralight text-[#020817] dark:text-white">
              Simulações
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-extralight">
              Calculadoras e simuladores fiscais
            </p>
          </div>
        </div>
      </div>

      {/* Grid de simuladores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {simulations.map((simulation, index) => (
          <motion.div
            key={simulation.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="bg-white dark:bg-[#0b1320] border-[#e6e6e6] dark:border-[#efc349]/20 hover:border-[#efc349]/40 dark:hover:border-[#efc349]/50 transition-all duration-300 hover:shadow-lg dark:hover:shadow-[#efc349]/10 group">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 ${simulation.bgColor} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <simulation.icon className={`w-6 h-6 ${simulation.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-[#020817] dark:text-white mb-2">
                      {simulation.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-extralight mb-4">
                      {simulation.description}
                    </p>
                    <Button 
                      asChild 
                      className="w-full bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817] font-medium"
                    >
                      <Link to={simulation.link}>
                        <Plus className="w-4 h-4 mr-2" />
                        Iniciar Simulação
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Histórico de simulações */}
      <Card className="bg-white dark:bg-[#0b1320] border-[#e6e6e6] dark:border-[#efc349]/20">
        <CardHeader>
          <CardTitle className="flex items-center text-[#020817] dark:text-white font-extralight">
            <FileText className="w-5 h-5 mr-2 text-[#efc349]" />
            Histórico de Simulações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-extralight">Nenhuma simulação realizada ainda</p>
            <p className="text-sm mt-2 font-extralight">
              Suas simulações aparecerão aqui após serem realizadas
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
