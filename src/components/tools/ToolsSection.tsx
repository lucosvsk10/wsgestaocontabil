
import { motion } from "framer-motion";
import { Calculator, PiggyBank, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ToolsSection = () => {
  const navigate = useNavigate();

  const tools = [
    {
      title: "Simulador IRPF",
      description: "Calcule seu Imposto de Renda Pessoa Física com precisão",
      icon: Calculator,
      route: "/simulador-irpf",
      color: "text-blue-600 dark:text-blue-400"
    },
    {
      title: "Calculadora INSS",
      description: "Simule suas contribuições do INSS de forma rápida",
      icon: PiggyBank,
      route: "/calculadora-inss",
      color: "text-green-600 dark:text-green-400"
    },
    {
      title: "Simulador Pró-labore",
      description: "Calcule o pró-labore ideal para sua empresa",
      icon: FileText,
      route: "/simulador-prolabore",
      color: "text-purple-600 dark:text-purple-400"
    }
  ];

  return (
    <section id="ferramentas" className="py-20 bg-white dark:bg-[#0b1320]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-extralight text-[#020817] dark:text-[#efc349] mb-6">
            FERRAMENTAS
          </h2>
          <div className="w-24 h-1 bg-[#efc349] mx-auto mb-8"></div>
          <p className="text-lg text-gray-600 dark:text-white/70 font-extralight max-w-2xl mx-auto">
            Utilize nossas calculadoras fiscais atualizadas com as regras de 2025 para simulações precisas e confiáveis.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {tools.map((tool, index) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="h-full border-[#efc349]/30 bg-white dark:bg-[#0b1320] hover:shadow-lg transition-all duration-300 hover:border-[#efc349]/60">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-3 rounded-full bg-[#efc349]/10 dark:bg-[#efc349]/20 w-fit">
                    <tool.icon className={`w-8 h-8 ${tool.color}`} />
                  </div>
                  <CardTitle className="text-xl font-extralight text-[#020817] dark:text-[#efc349]">
                    {tool.title}
                  </CardTitle>
                  <CardDescription className="font-extralight text-gray-600 dark:text-white/70">
                    {tool.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-4">
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-600 dark:text-white/70 font-extralight">
                      <span className="w-2 h-2 bg-[#efc349] rounded-full mr-2"></span>
                      Resultados baseados nas regras oficiais 2025
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-white/70 font-extralight">
                      <span className="w-2 h-2 bg-[#efc349] rounded-full mr-2"></span>
                      Opções para imprimir, salvar e copiar resultados
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-white/70 font-extralight">
                      <span className="w-2 h-2 bg-[#efc349] rounded-full mr-2"></span>
                      Simulações salvas no seu perfil
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => navigate(tool.route)}
                    className="w-full bg-[#020817] dark:bg-transparent border border-[#efc349] text-white dark:text-[#efc349] hover:bg-[#020817]/90 dark:hover:bg-[#efc349]/10 font-extralight"
                  >
                    Acessar Calculadora
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
