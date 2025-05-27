
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
          Simulador de Imposto de Renda 2025
        </CardTitle>
        <CardDescription className="font-extralight">
          Calcule uma estimativa do seu IR e saiba se terá imposto a pagar ou estará isento
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-[#020817]/80 dark:text-white/80 text-sm mb-4 font-extralight">
          Utilize nossa ferramenta atualizada para simular o cálculo do seu Imposto de Renda 2025.
          Uma forma simples e confiável de se planejar financeiramente.
        </p>
        <ul className="text-sm text-[#020817]/70 dark:text-white/70 list-disc list-inside space-y-1 font-extralight">
          <li>Cálculo baseado nas regras oficiais da Receita Federal</li>
          <li>Estimativa precisa de imposto devido ou isenção</li>
          <li>Interface moderna e responsiva</li>
          <li>Resultados detalhados por faixas de tributação</li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => navigate("/simulador-irpf")}
          className="w-full flex items-center justify-center gap-2 font-extralight"
        >
          Simular IRPF 2025 <ArrowRight size={18} />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TaxCalculatorCard;
