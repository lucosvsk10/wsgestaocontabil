
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const TaxCalculatorCard = () => {
  const navigate = useNavigate();
  
  return (
    <Card className="border-gold/30 overflow-hidden bg-white dark:bg-navy-dark hover:shadow-lg transition-all duration-300">
      <CardHeader className="bg-gold/10 dark:bg-navy-light/10 pb-2">
        <CardTitle className="text-navy dark:text-gold text-xl font-medium">
          Simulador de Imposto de Renda
        </CardTitle>
        <CardDescription>
          Calcule uma estimativa do seu IR e saiba se terá imposto a pagar ou restituição
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-navy/80 dark:text-white/80 text-sm mb-4">
          Utilize nossa ferramenta para simular o cálculo do seu Imposto de Renda.
          Uma forma simples de se planejar financeiramente.
        </p>
        <ul className="text-sm text-navy/70 dark:text-white/70 list-disc list-inside space-y-1">
          <li>Cálculo rápido e simplificado</li>
          <li>Estimativa de restituição ou valor a pagar</li>
          <li>Gráficos e resultados detalhados</li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => navigate("/simulador-irpf")}
          className="w-full flex items-center justify-center gap-2"
        >
          Simular IRPF <ArrowRight size={18} />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TaxCalculatorCard;
