
import { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import TaxForm from "@/components/tax-calculator/TaxForm";
import ResultChart from "@/components/tax-calculator/ResultChart";
import TaxResultDisplay from "@/components/tax-calculator/TaxResultDisplay";
import ResultActions from "@/components/tax-calculator/ResultActions";
import { TaxFormValues, TaxResult } from "@/types/tax-simulations";
import { calculateTaxBrackets } from "@/utils/taxCalculations";

// Constantes para o cálculo
const DEDUCAO_POR_DEPENDENTE = 2275.08; // Valor 2024
const LIMITE_EDUCACAO = 3561.50; // Valor 2024

const TaxCalculator = () => {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  
  // Estado para armazenar resultado do cálculo
  const [result, setResult] = useState<TaxResult | null>(null);
  
  // Inicializar o formulário
  const form = useForm<TaxFormValues>({
    defaultValues: {
      rendimentoBruto: 0,
      inss: 0,
      educacao: 0,
      saude: 0,
      dependentes: 0,
      outrasDeducoes: 0,
      nome: userData?.name || "",
      email: userData?.email || "",
      telefone: "",
    },
  });

  // Função para calcular o imposto
  const calculateTax = (values: TaxFormValues): TaxResult => {
    // Convertendo valores para números
    const rendimentoBruto = Number(values.rendimentoBruto);
    const inss = Number(values.inss);
    const educacao = Math.min(Number(values.educacao), LIMITE_EDUCACAO); // Limitar dedução com educação
    const saude = Number(values.saude);
    const dependentes = Number(values.dependentes);
    const outrasDeducoes = Number(values.outrasDeducoes);
    
    // Calcular dedução por dependentes
    const deducaoDependentes = dependentes * DEDUCAO_POR_DEPENDENTE;
    
    // Total de deduções
    const totalDeducoes = inss + educacao + saude + deducaoDependentes + outrasDeducoes;
    
    // Base de cálculo
    const baseCalculo = Math.max(rendimentoBruto - totalDeducoes, 0);
    
    // Calcular imposto por faixas progressivas
    const impostoCalculado = calculateTaxBrackets(baseCalculo);
    
    // Determinar se é restituição ou valor a pagar
    const tipoSimulacao = impostoCalculado <= 0 ? "restituição" : "a pagar";
    
    return {
      total: Math.abs(impostoCalculado),
      tipoSimulacao,
      rendimentoBruto,
      totalDeducoes,
      impostoCalculado: Math.abs(impostoCalculado),
    };
  };

  // Submeter o formulário
  const onSubmit = (values: TaxFormValues) => {
    // Calcular resultados
    const calculatedResult = calculateTax(values);
    setResult(calculatedResult);
    
    // Scroll para a área de resultados
    setTimeout(() => {
      document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Salvar a simulação no banco de dados
  const saveSimulation = async () => {
    if (!result) return;
    
    try {
      const simulationData = {
        user_id: user?.id,
        rendimento_bruto: form.getValues("rendimentoBruto"),
        inss: form.getValues("inss"),
        educacao: form.getValues("educacao"),
        saude: form.getValues("saude"),
        dependentes: form.getValues("dependentes"),
        outras_deducoes: form.getValues("outrasDeducoes"),
        imposto_estimado: result.total,
        tipo_simulacao: result.tipoSimulacao,
        nome: form.getValues("nome"),
        email: form.getValues("email"),
        telefone: form.getValues("telefone"),
      };
      
      const { error } = await supabase.from("tax_simulations").insert(simulationData);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Simulação enviada com sucesso!",
        description: "Nossa equipe analisará e entrará em contato.",
      });
    } catch (error) {
      console.error("Erro ao salvar simulação:", error);
      toast({
        title: "Erro ao enviar simulação",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  // Contato via WhatsApp
  const contactWhatsApp = () => {
    const message = `Olá! Realizei uma simulação no site WS Gestão Contábil e gostaria de mais informações sobre o resultado do meu Imposto de Renda.`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/5511999999999?text=${encodedMessage}`, "_blank");
  };

  return (
    <div className="bg-inherit">
      <div className="px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8">
            <CardContent className="pt-6">
              <TaxForm onSubmit={onSubmit} defaultValues={form.getValues()} />
            </CardContent>
          </Card>
          
          {/* Resultados */}
          {result && (
            <div id="resultados" className="scroll-mt-16 space-y-8">
              <TaxResultDisplay result={result} />
              <ResultChart result={result} />
              <ResultActions
                isLoggedIn={!!user}
                form={form}
                onSaveSimulation={saveSimulation}
                onContactWhatsApp={contactWhatsApp}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaxCalculator;
