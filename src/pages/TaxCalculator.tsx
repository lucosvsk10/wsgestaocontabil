
import { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calculator, HelpCircle, Download, Copy, Printer, Send } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { currencyFormat } from "@/utils/taxCalculations";
import { Badge } from "@/components/ui/badge";

interface TaxFormData {
  income: number;
  dependents: number;
  inss: number;
  alimony: number;
  education: number;
  health: number;
  otherDeductions: number;
  name?: string;
  email?: string;
  phone?: string;
}

interface TaxCalculationResult {
  totalIncome: number;
  totalDeductions: number;
  taxableBase: number;
  taxDue: number;
  effectiveRate: number;
  brackets: Array<{
    rate: number;
    base: number;
    tax: number;
    range: string;
  }>;
}

const TaxCalculator = () => {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [result, setResult] = useState<TaxCalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<TaxFormData>({
    defaultValues: {
      income: 0,
      dependents: 0,
      inss: 0,
      alimony: 0,
      education: 0,
      health: 0,
      otherDeductions: 0,
      name: userData?.name || "",
      email: userData?.email || "",
      phone: "",
    },
  });

  // Faixas do IRPF 2025 (valores mensais)
  const taxBrackets = [
    { min: 0, max: 2259.20, rate: 0, deduction: 0 },
    { min: 2259.21, max: 2826.65, rate: 0.075, deduction: 169.44 },
    { min: 2826.66, max: 3751.05, rate: 0.15, deduction: 381.44 },
    { min: 3751.06, max: 4664.68, rate: 0.225, deduction: 662.77 },
    { min: 4664.69, max: Infinity, rate: 0.275, deduction: 896.00 }
  ];

  const calculateTax = (data: TaxFormData): TaxCalculationResult => {
    // Constantes 2025
    const DEPENDENT_DEDUCTION = 2275.08;
    const EDUCATION_LIMIT = 3561.50;

    const annualIncome = Number(data.income);
    const dependentsDeduction = Number(data.dependents) * DEPENDENT_DEDUCTION;
    const inssDeduction = Number(data.inss);
    const alimonyDeduction = Number(data.alimony);
    const educationDeduction = Math.min(Number(data.education), EDUCATION_LIMIT);
    const healthDeduction = Number(data.health);
    const otherDeductions = Number(data.otherDeductions);

    const totalDeductions = dependentsDeduction + inssDeduction + alimonyDeduction + 
                           educationDeduction + healthDeduction + otherDeductions;

    const taxableBase = Math.max(annualIncome - totalDeductions, 0);
    const monthlyBase = taxableBase / 12;

    // Cálculo do imposto por faixas
    let taxDue = 0;
    let applicableBracket = taxBrackets[0];
    const brackets = [];

    for (const bracket of taxBrackets) {
      if (monthlyBase > bracket.min) {
        applicableBracket = bracket;
        const bracketBase = Math.min(monthlyBase, bracket.max) - bracket.min;
        const bracketTax = bracketBase * bracket.rate;
        
        if (bracketBase > 0) {
          brackets.push({
            rate: bracket.rate,
            base: bracketBase * 12,
            tax: bracketTax * 12,
            range: bracket.max === Infinity 
              ? `Acima de ${currencyFormat(bracket.min * 12)}` 
              : `${currencyFormat(bracket.min * 12)} - ${currencyFormat(bracket.max * 12)}`
          });
        }
      }
    }

    // Cálculo simplificado usando a fórmula da tabela progressiva
    if (monthlyBase > 2259.20) {
      taxDue = (monthlyBase * applicableBracket.rate - applicableBracket.deduction) * 12;
    }

    taxDue = Math.max(taxDue, 0);
    const effectiveRate = annualIncome > 0 ? (taxDue / annualIncome) * 100 : 0;

    return {
      totalIncome: annualIncome,
      totalDeductions,
      taxableBase,
      taxDue,
      effectiveRate,
      brackets
    };
  };

  const onSubmit = async (data: TaxFormData) => {
    setIsCalculating(true);
    try {
      const calculationResult = calculateTax(data);
      setResult(calculationResult);
      
      // Scroll suave para o resultado
      setTimeout(() => {
        document.getElementById('result-section')?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    } catch (error) {
      toast({
        title: "Erro no cálculo",
        description: "Ocorreu um erro ao calcular o imposto. Verifique os dados.",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const saveSimulation = async () => {
    if (!result) return;
    
    setIsSaving(true);
    try {
      const formData = form.getValues();
      
      const simulationData = {
        user_id: user?.id || null,
        rendimento_bruto: result.totalIncome,
        inss: formData.inss,
        educacao: formData.education,
        saude: formData.health,
        dependentes: formData.dependents,
        outras_deducoes: formData.alimony + formData.otherDeductions,
        imposto_estimado: result.taxDue,
        tipo_simulacao: result.taxDue > 0 ? "a pagar" : "restituição",
        nome: formData.name,
        email: formData.email,
        telefone: formData.phone,
      };

      const { error } = await supabase
        .from("tax_simulations")
        .insert(simulationData);

      if (error) throw error;

      toast({
        title: "Simulação salva!",
        description: "Sua simulação foi salva com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a simulação.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    
    const text = `
Simulação IRPF 2025
Rendimento Anual: ${currencyFormat(result.totalIncome)}
Total de Deduções: ${currencyFormat(result.totalDeductions)}
Base de Cálculo: ${currencyFormat(result.taxableBase)}
Imposto Devido: ${currencyFormat(result.taxDue)}
Alíquota Efetiva: ${result.effectiveRate.toFixed(2)}%
    `.trim();
    
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Resultado copiado para a área de transferência." });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#020817] py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-[#efc349]/10">
              <Calculator className="h-8 w-8 text-[#efc349]" />
            </div>
            <h1 className="text-4xl font-extralight text-[#020817] dark:text-[#efc349]">
              Simulador de IRPF 2025
            </h1>
          </div>
          <p className="text-lg font-extralight text-gray-600 dark:text-white/70 max-w-2xl mx-auto">
            Calcule uma estimativa do seu Imposto de Renda com base nas regras oficiais da Receita Federal
          </p>
        </div>

        {/* Calculator Form */}
        <Card className="bg-white dark:bg-transparent border-gray-100 dark:border-[#efc349]/20">
          <CardHeader>
            <CardTitle className="text-2xl font-extralight text-[#020817] dark:text-[#efc349] flex items-center gap-2">
              <Calculator className="h-6 w-6" />
              Dados para Simulação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Income Section */}
              <div className="space-y-6">
                <h3 className="text-lg font-extralight text-[#020817] dark:text-white border-b pb-2">
                  Rendimentos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="income" className="font-extralight">
                        Rendimento Tributável Anual (R$) *
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              Soma de todos os rendimentos tributáveis recebidos no ano, como salários, aluguéis, etc.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="income"
                      type="number"
                      step="0.01"
                      min="0"
                      className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                      {...form.register("income", { required: true, valueAsNumber: true })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="dependents" className="font-extralight">
                        Número de Dependentes
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              Cada dependente permite dedução de R$ 2.275,08
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="dependents"
                      type="number"
                      min="0"
                      step="1"
                      className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                      {...form.register("dependents", { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>

              <Separator className="dark:bg-[#efc349]/20" />

              {/* Deductions Section */}
              <div className="space-y-6">
                <h3 className="text-lg font-extralight text-[#020817] dark:text-white border-b pb-2">
                  Deduções
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="inss" className="font-extralight">
                        INSS Pago (R$)
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              Total de contribuições ao INSS no ano
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="inss"
                      type="number"
                      step="0.01"
                      min="0"
                      className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                      {...form.register("inss", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="alimony" className="font-extralight">
                        Pensão Alimentícia (R$)
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              Valor pago de pensão alimentícia no ano
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="alimony"
                      type="number"
                      step="0.01"
                      min="0"
                      className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                      {...form.register("alimony", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="education" className="font-extralight">
                        Educação (R$)
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              Despesas com educação (limite R$ 3.561,50)
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="education"
                      type="number"
                      step="0.01"
                      min="0"
                      max="3561.50"
                      className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                      {...form.register("education", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="health" className="font-extralight">
                        Saúde (R$)
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              Despesas médicas e de saúde (sem limite)
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="health"
                      type="number"
                      step="0.01"
                      min="0"
                      className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                      {...form.register("health", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="otherDeductions" className="font-extralight">
                        Outras Deduções (R$)
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              Previdência privada, doações, etc.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="otherDeductions"
                      type="number"
                      step="0.01"
                      min="0"
                      className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                      {...form.register("otherDeductions", { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Section */}
              {!user && (
                <>
                  <Separator className="dark:bg-[#efc349]/20" />
                  <div className="space-y-6">
                    <h3 className="text-lg font-extralight text-[#020817] dark:text-white border-b pb-2">
                      Contato (Opcional)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        placeholder="Nome"
                        className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                        {...form.register("name")}
                      />
                      <Input
                        placeholder="E-mail"
                        type="email"
                        className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                        {...form.register("email")}
                      />
                      <Input
                        placeholder="Telefone"
                        className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                        {...form.register("phone")}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <div className="flex justify-center pt-4">
                <Button
                  type="submit"
                  disabled={isCalculating}
                  size="lg"
                  className="min-w-[200px] font-extralight bg-[#020817] dark:bg-transparent dark:border dark:border-[#efc349] text-white dark:text-[#efc349] hover:bg-[#0f172a] dark:hover:bg-[#efc349]/10"
                >
                  {isCalculating ? "Calculando..." : "Calcular IRPF"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <div id="result-section" className="space-y-6">
            {/* Main Result */}
            <Card className="bg-white dark:bg-transparent border-gray-100 dark:border-[#efc349]/20">
              <CardHeader>
                <CardTitle className="text-2xl font-extralight text-[#020817] dark:text-[#efc349] text-center">
                  Resultado da Simulação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-extralight text-gray-600 dark:text-white/70">
                        Rendimento Total
                      </p>
                      <p className="text-lg font-extralight text-[#020817] dark:text-white">
                        {currencyFormat(result.totalIncome)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-extralight text-gray-600 dark:text-white/70">
                        Total de Deduções
                      </p>
                      <p className="text-lg font-extralight text-blue-600 dark:text-blue-400">
                        {currencyFormat(result.totalDeductions)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-extralight text-gray-600 dark:text-white/70">
                        Base de Cálculo
                      </p>
                      <p className="text-lg font-extralight text-[#020817] dark:text-white">
                        {currencyFormat(result.taxableBase)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-extralight text-gray-600 dark:text-white/70">
                        Alíquota Efetiva
                      </p>
                      <p className="text-lg font-extralight text-[#020817] dark:text-[#efc349]">
                        {result.effectiveRate.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <div className="py-6">
                    <p className="text-sm font-extralight text-gray-600 dark:text-white/70 mb-2">
                      Imposto Devido
                    </p>
                    <p className={`text-4xl font-extralight ${
                      result.taxDue > 0 
                        ? 'text-red-500 dark:text-red-400' 
                        : 'text-green-500 dark:text-green-400'
                    }`}>
                      {currencyFormat(result.taxDue)}
                    </p>
                    <Badge 
                      className={`mt-2 font-extralight ${
                        result.taxDue > 0 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      }`}
                    >
                      {result.taxDue > 0 ? 'A pagar' : 'Isento'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="bg-white dark:bg-transparent border-gray-100 dark:border-[#efc349]/20">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    className="font-extralight border-[#efc349]/30 hover:bg-[#efc349]/10"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Resultado
                  </Button>
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    className="font-extralight border-[#efc349]/30 hover:bg-[#efc349]/10"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </Button>
                  <Button
                    onClick={saveSimulation}
                    disabled={isSaving}
                    className="font-extralight bg-[#020817] dark:bg-transparent dark:border dark:border-[#efc349] text-white dark:text-[#efc349] hover:bg-[#0f172a] dark:hover:bg-[#efc349]/10"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSaving ? "Salvando..." : "Salvar Simulação"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Breakdown */}
            {result.brackets.length > 0 && (
              <Card className="bg-white dark:bg-transparent border-gray-100 dark:border-[#efc349]/20">
                <CardHeader>
                  <CardTitle className="text-xl font-extralight text-[#020817] dark:text-[#efc349]">
                    Detalhamento por Faixas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.brackets.map((bracket, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#efc349]/10 last:border-0">
                        <div>
                          <p className="font-extralight text-[#020817] dark:text-white">
                            {bracket.range}
                          </p>
                          <p className="text-sm font-extralight text-gray-600 dark:text-white/70">
                            Alíquota: {(bracket.rate * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-extralight text-[#020817] dark:text-white">
                            {currencyFormat(bracket.tax)}
                          </p>
                          <p className="text-sm font-extralight text-gray-600 dark:text-white/70">
                            Base: {currencyFormat(bracket.base)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaxCalculator;
