
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const TaxCalculatorCard = () => {
  const navigate = useNavigate();
  
  return (
    <Card className="border-[#efc349]/30 overflow-hidden bg-white dark:bg-transparent hover:shadow-lg transition-all duration-300">
      <CardHeader className="bg-[#efc349]/10 dark:bg-[#efc349]/10 pb-2">
        <CardTitle className="text-[#020817] dark:text-[#efc349] text-xl font-extralight">
          Calculadoras Fiscais
        </CardTitle>
        <CardDescription className="font-extralight">
          Acesse nossas calculadoras de IRPF, INSS e Pró-labore
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-[#020817]/80 dark:text-white/80 text-sm mb-4 font-extralight">
          Utilize nossas ferramentas atualizadas para fazer simulações fiscais precisas e confiáveis.
        </p>
        <ul className="text-sm text-[#020817]/70 dark:text-white/70 list-disc list-inside space-y-1 font-extralight">
          <li>Simulador de Imposto de Renda (IRPF)</li>
          <li>Calculadora de INSS</li>
          <li>Simulador de Pró-labore</li>
          <li>Resultados baseados nas regras oficiais 2025</li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => navigate("/simulador-irpf")}
          className="w-full flex items-center justify-center gap-2 font-extralight"
        >
          Acessar Calculadoras <ArrowRight size={18} />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TaxCalculatorCard;
