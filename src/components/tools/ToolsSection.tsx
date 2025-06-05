
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, CreditCard, Building2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';

const ToolsSection = () => {
  const navigate = useNavigate();

  const tools = [
    {
      title: "Simulador de IRPF",
      description: "Calcule seu Imposto de Renda de forma rápida e precisa",
      icon: <Calculator className="h-12 w-12 text-[#efc349]" />,
      route: "/simulador-irpf"
    },
    {
      title: "Calculadora de INSS",
      description: "Simule suas contribuições do INSS por categoria",
      icon: <CreditCard className="h-12 w-12 text-[#efc349]" />,
      route: "/calculadora-inss"
    },
    {
      title: "Simulador de Pró-labore",
      description: "Calcule valores líquidos de pró-labore com descontos",
      icon: <Building2 className="h-12 w-12 text-[#efc349]" />,
      route: "/simulador-prolabore"
    }
  ];

  return (
    <section id="ferramentas" className="py-20 bg-white dark:bg-[#020817]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-extralight text-[#020817] dark:text-[#efc349] mb-6">
            FERRAMENTAS
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto font-extralight">
            Utilize nossas calculadoras e simuladores para ter resultados precisos e confiáveis
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tools.map((tool, index) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="h-full hover:shadow-lg transition-all duration-300 bg-transparent border-[#efc349]/20 hover:border-[#efc349]/40">
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 rounded-full bg-[#efc349]/10">
                      {tool.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl font-extralight text-[#020817] dark:text-[#efc349]">
                    {tool.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-600 dark:text-gray-300 mb-6 font-extralight">
                    {tool.description}
                  </p>
                  <Button 
                    onClick={() => navigate(tool.route)}
                    className="w-full bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817] font-extralight"
                  >
                    Acessar Ferramenta
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ToolsSection;
