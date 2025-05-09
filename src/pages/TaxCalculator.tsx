
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { HelpCircle } from "lucide-react";
import { currencyFormat, calculateTaxBrackets } from "@/utils/taxCalculations";

// Definindo os tipos para o formulário
interface TaxFormValues {
  rendimentoBruto: number;
  inss: number;
  educacao: number;
  saude: number;
  dependentes: number;
  outrasDeducoes: number;
  nome?: string;
  email?: string;
  telefone?: string;
}

// Constantes para o cálculo
const DEDUCAO_POR_DEPENDENTE = 2275.08; // Valor 2024
const LIMITE_EDUCACAO = 3561.50; // Valor 2024

const TaxCalculator = () => {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [result, setResult] = useState<{
    total: number;
    tipoSimulacao: string;
    rendimentoBruto: number;
    totalDeducoes: number;
  } | null>(null);
  
  const [showContactForm, setShowContactForm] = useState(false);
  
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
  const calculateTax = (values: TaxFormValues) => {
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
  const onSubmit = async (values: TaxFormValues) => {
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

  // Dados para o gráfico
  const getChartData = () => {
    if (!result) return [];
    
    return [
      { name: "Rendimento", value: result.rendimentoBruto },
      { name: "Deduções", value: result.totalDeducoes },
      { name: "Imposto", value: result.total },
    ];
  };
  
  const COLORS = ["#efc349", "#2f3c58", "#8aa3bd"];

  return (
    <div className="bg-white dark:bg-navy-dark min-h-screen">
      <Navbar />
      
      <main className="container py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-navy dark:text-gold mb-4">
              Simulador de Imposto de Renda
            </h1>
            <p className="text-navy/70 dark:text-white/70">
              Faça uma simulação rápida do seu Imposto de Renda e descubra se terá restituição ou valor a pagar.
            </p>
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-navy-light/20 border border-gold/30 rounded-md">
              <p className="text-sm text-navy/80 dark:text-white/80 font-medium">
                Esta simulação é apenas estimativa e não substitui o cálculo oficial da Receita Federal.
              </p>
            </div>
          </div>
          
          <Card className="mb-8">
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Rendimento Bruto */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <label htmlFor="rendimentoBruto" className="text-sm font-medium">
                          Rendimento Anual Bruto (R$)
                        </label>
                        <TooltipProvider>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle size={16} className="text-navy/60 dark:text-white/60" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                Soma de todos os rendimentos tributáveis recebidos no ano (salários, aluguéis, etc).
                              </p>
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        id="rendimentoBruto"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        {...form.register("rendimentoBruto", { 
                          required: true,
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    
                    {/* Contribuição INSS */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <label htmlFor="inss" className="text-sm font-medium">
                          Contribuição ao INSS (R$)
                        </label>
                        <TooltipProvider>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle size={16} className="text-navy/60 dark:text-white/60" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                Total de contribuições ao INSS no ano.
                              </p>
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        id="inss"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        {...form.register("inss", { 
                          required: true,
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    
                    {/* Despesas com Educação */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <label htmlFor="educacao" className="text-sm font-medium">
                          Despesas com Educação (R$)
                        </label>
                        <TooltipProvider>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle size={16} className="text-navy/60 dark:text-white/60" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                Despesas com educação formal (limite de R$ 3.561,50 por pessoa).
                              </p>
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        id="educacao"
                        type="number"
                        step="0.01"
                        min="0"
                        {...form.register("educacao", { valueAsNumber: true })}
                      />
                    </div>
                    
                    {/* Despesas com Saúde */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <label htmlFor="saude" className="text-sm font-medium">
                          Despesas com Saúde (R$)
                        </label>
                        <TooltipProvider>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle size={16} className="text-navy/60 dark:text-white/60" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                Despesas médicas, planos de saúde, exames, etc. Sem limite de dedução.
                              </p>
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        id="saude"
                        type="number"
                        step="0.01"
                        min="0"
                        {...form.register("saude", { valueAsNumber: true })}
                      />
                    </div>
                    
                    {/* Número de Dependentes */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <label htmlFor="dependentes" className="text-sm font-medium">
                          Número de Dependentes
                        </label>
                        <TooltipProvider>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle size={16} className="text-navy/60 dark:text-white/60" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                Dedução de R$ 2.275,08 por dependente (filhos, cônjuge, etc).
                              </p>
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        id="dependentes"
                        type="number"
                        min="0"
                        step="1"
                        {...form.register("dependentes", { valueAsNumber: true })}
                      />
                    </div>
                    
                    {/* Outras Deduções */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <label htmlFor="outrasDeducoes" className="text-sm font-medium">
                          Outras Deduções (R$)
                        </label>
                        <TooltipProvider>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle size={16} className="text-navy/60 dark:text-white/60" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                Pensão alimentícia, previdência privada (PGBL), doações, etc.
                              </p>
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        id="outrasDeducoes"
                        type="number"
                        step="0.01"
                        min="0"
                        {...form.register("outrasDeducoes", { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <Button type="submit" size="lg" className="min-w-[200px]">
                      Simular agora
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          {/* Resultados */}
          {result && (
            <div id="resultados" className="scroll-mt-16 space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-navy dark:text-gold mb-2">
                  Resultado da Simulação
                </h2>
                <p className="text-lg text-navy/90 dark:text-white/90">
                  Com base nas informações fornecidas, você teria:
                </p>
                <div className="mt-4 mb-8">
                  <p className="text-3xl font-bold mb-1 text-navy dark:text-gold">
                    {currencyFormat(result.total)}
                  </p>
                  <p className="text-lg text-navy/80 dark:text-white/80">
                    a {result.tipoSimulacao}
                  </p>
                </div>
              </div>
              
              {/* Gráfico */}
              <Card className="mb-8 p-4">
                <CardContent className="flex flex-col items-center">
                  <div className="w-full h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getChartData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => currencyFormat(Number(value))} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="mt-4 w-full grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-navy/70 dark:text-white/70">Rendimento Total:</p>
                      <p className="font-medium">{currencyFormat(result.rendimentoBruto)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-navy/70 dark:text-white/70">Total de Deduções:</p>
                      <p className="font-medium">{currencyFormat(result.totalDeducoes)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-navy/70 dark:text-white/70">Imposto Calculado:</p>
                      <p className="font-medium">{currencyFormat(result.total)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Ações para usuários logados ou não */}
              <div className="flex flex-col md:flex-row justify-center gap-4 mb-8">
                {user ? (
                  <Button onClick={saveSimulation} className="min-w-[200px]">
                    Enviar simulação para análise da WS
                  </Button>
                ) : (
                  <>
                    {!showContactForm ? (
                      <div className="space-y-4 w-full max-w-md mx-auto">
                        <Button onClick={() => setShowContactForm(true)} className="w-full">
                          Enviar para análise personalizada
                        </Button>
                        <Button onClick={contactWhatsApp} variant="outline" className="w-full">
                          Fale com a WS
                        </Button>
                      </div>
                    ) : (
                      <Card className="w-full max-w-md mx-auto">
                        <CardContent className="pt-6">
                          <h3 className="text-lg font-medium mb-4 text-navy dark:text-gold">
                            Seus dados para contato
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <label htmlFor="nome" className="text-sm font-medium">
                                Nome completo
                              </label>
                              <Input
                                id="nome"
                                {...form.register("nome")}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label htmlFor="email" className="text-sm font-medium">
                                Email
                              </label>
                              <Input
                                id="email"
                                type="email"
                                {...form.register("email")}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label htmlFor="telefone" className="text-sm font-medium">
                                Telefone
                              </label>
                              <Input
                                id="telefone"
                                {...form.register("telefone")}
                                className="mt-1"
                              />
                            </div>
                            <div className="pt-2">
                              <Button onClick={saveSimulation} className="w-full">
                                Enviar simulação
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default TaxCalculator;
