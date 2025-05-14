
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, 
  Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from "recharts";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { HelpCircle, Download, Send, Calculator, Check, AlertTriangle, FileCheck, InfoIcon } from "lucide-react";
import { 
  currencyFormat, 
  calculateFullTaxResult, 
  TaxFormInput, 
  TaxResult,
  TAX_CONSTANTS
} from "@/utils/taxCalculations";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

// Definindo o schema de validação com zod
const taxFormSchema = z.object({
  rendimentosTributaveis: z.coerce.number().min(0, "Valor não pode ser negativo"),
  rendimentosIsentos: z.coerce.number().min(0, "Valor não pode ser negativo"),
  contribuicaoPrevidenciaria: z.coerce.number().min(0, "Valor não pode ser negativo"),
  despesasMedicas: z.coerce.number().min(0, "Valor não pode ser negativo"),
  despesasEducacao: z.coerce.number().min(0, "Valor não pode ser negativo"),
  pensaoAlimenticia: z.coerce.number().min(0, "Valor não pode ser negativo"),
  livroCaixa: z.coerce.number().min(0, "Valor não pode ser negativo"),
  numeroDependentes: z.coerce.number().int().min(0, "Valor não pode ser negativo"),
  impostoRetidoFonte: z.coerce.number().min(0, "Valor não pode ser negativo"),
  ehAposentado65: z.boolean().default(false),
  tipoDeclaracao: z.enum(['completa', 'simplificada']).default('completa'),
  nome: z.string().optional(),
  email: z.string().email("Email inválido").optional(),
  telefone: z.string().optional(),
  observacoes: z.string().optional(),
});

type TaxFormValues = z.infer<typeof taxFormSchema>;

const TaxCalculator = () => {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [result, setResult] = useState<TaxResult | null>(null);
  const [activeTab, setActiveTab] = useState("formulario");
  const [showContactForm, setShowContactForm] = useState(false);
  
  // Inicializar o formulário com zod resolver
  const form = useForm<TaxFormValues>({
    resolver: zodResolver(taxFormSchema),
    defaultValues: {
      rendimentosTributaveis: 0,
      rendimentosIsentos: 0,
      contribuicaoPrevidenciaria: 0,
      despesasMedicas: 0,
      despesasEducacao: 0,
      pensaoAlimenticia: 0,
      livroCaixa: 0,
      numeroDependentes: 0,
      impostoRetidoFonte: 0,
      ehAposentado65: false,
      tipoDeclaracao: 'completa',
      nome: userData?.name || "",
      email: userData?.email || "",
      telefone: "",
      observacoes: "",
    },
  });

  // Observar mudanças no tipo de declaração para recalcular
  const tipoDeclaracao = form.watch('tipoDeclaracao');
  const watchedValues = form.watch();

  // Submeter o formulário
  const onSubmit = (values: TaxFormValues) => {
    // Calcular resultados
    const taxInput: TaxFormInput = {
      rendimentosTributaveis: values.rendimentosTributaveis,
      rendimentosIsentos: values.rendimentosIsentos,
      contribuicaoPrevidenciaria: values.contribuicaoPrevidenciaria,
      despesasMedicas: values.despesasMedicas,
      despesasEducacao: values.despesasEducacao,
      pensaoAlimenticia: values.pensaoAlimenticia,
      livroCaixa: values.livroCaixa,
      numeroDependentes: values.numeroDependentes,
      impostoRetidoFonte: values.impostoRetidoFonte,
      ehAposentado65: values.ehAposentado65,
      tipoDeclaracao: values.tipoDeclaracao,
    };
    
    const calculatedResult = calculateFullTaxResult(taxInput);
    setResult(calculatedResult);
    
    // Mudar para a aba de resultados
    setActiveTab("resultados");
    
    // Scroll para a área de resultados
    setTimeout(() => {
      document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Exportar para PDF
  const exportToPDF = () => {
    if (!result) return;
    
    const doc = new jsPDF();
    const formValues = form.getValues();
    
    // Título
    doc.setFontSize(20);
    doc.text("Simulação de Imposto de Renda - WS Gestão Contábil", 14, 22);
    
    // Data da simulação
    doc.setFontSize(10);
    doc.text(`Data da simulação: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
    
    // Dados do contribuinte
    doc.setFontSize(12);
    doc.text("Dados do Contribuinte", 14, 40);
    
    const contributorData = [
      ["Nome", formValues.nome || "Não informado"],
      ["Email", formValues.email || "Não informado"],
      ["Telefone", formValues.telefone || "Não informado"],
    ];
    
    (doc as any).autoTable({
      startY: 45,
      head: [],
      body: contributorData,
      theme: 'grid',
      headStyles: { fillColor: [45, 52, 54] },
    });
    
    // Rendimentos e Deduções
    doc.text("Rendimentos e Deduções", 14, (doc as any).lastAutoTable.finalY + 10);
    
    const incomeData = [
      ["Rendimentos Tributáveis", currencyFormat(formValues.rendimentosTributaveis)],
      ["Rendimentos Isentos", currencyFormat(formValues.rendimentosIsentos)],
      ["Contribuição Previdenciária", currencyFormat(formValues.contribuicaoPrevidenciaria)],
      ["Despesas Médicas", currencyFormat(formValues.despesasMedicas)],
      ["Despesas com Educação", currencyFormat(formValues.despesasEducacao)],
      ["Pensão Alimentícia", currencyFormat(formValues.pensaoAlimenticia)],
      ["Despesas de Livro-Caixa", currencyFormat(formValues.livroCaixa)],
      ["Número de Dependentes", formValues.numeroDependentes.toString()],
      ["Imposto Retido na Fonte", currencyFormat(formValues.impostoRetidoFonte)],
      ["Aposentado acima de 65 anos", formValues.ehAposentado65 ? "Sim" : "Não"],
      ["Tipo de Declaração", formValues.tipoDeclaracao === 'completa' ? "Completa" : "Simplificada"],
    ];
    
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [],
      body: incomeData,
      theme: 'grid',
      headStyles: { fillColor: [45, 52, 54] },
    });
    
    // Resultado da simulação
    doc.text("Resultado da Simulação", 14, (doc as any).lastAutoTable.finalY + 10);
    
    const tipoSaldoTexto = result.tipoSaldo === 'pagar' ? 'a pagar' : 
                           result.tipoSaldo === 'restituir' ? 'a restituir' : 'zerado';
    
    const resultData = [
      ["Modelo Recomendado", result.declaracaoRecomendada === 'completa' ? "Completa" : "Simplificada"],
      ["Base de Cálculo (Modelo Completo)", currencyFormat(result.baseDeCalculo.completa)],
      ["Base de Cálculo (Modelo Simplificado)", currencyFormat(result.baseDeCalculo.simplificada)],
      ["Imposto Devido (Modelo Completo)", currencyFormat(result.impostoDevido.completo)],
      ["Imposto Devido (Modelo Simplificado)", currencyFormat(result.impostoDevido.simplificado)],
      ["Imposto Retido na Fonte", currencyFormat(result.impostoRetidoFonte)],
      [`Saldo de Imposto (${tipoSaldoTexto})`, currencyFormat(result.saldoImposto)],
    ];
    
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [],
      body: resultData,
      theme: 'grid',
      headStyles: { fillColor: [45, 52, 54] },
    });
    
    // Rodapé
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(8);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text('WS Gestão Contábil - Este documento é apenas uma simulação. Não substitui a declaração oficial.', 14, doc.internal.pageSize.height - 10);
    }
    
    // Salvar o PDF
    doc.save("simulacao-irpf-ws-contabil.pdf");
    
    toast({
      title: "PDF gerado com sucesso!",
      description: "O arquivo foi baixado para o seu dispositivo.",
    });
  };

  // Salvar a simulação no banco de dados
  const saveSimulation = async () => {
    if (!result) return;
    
    try {
      const formValues = form.getValues();
      
      const simulationData = {
        user_id: user?.id,
        rendimentos_tributaveis: formValues.rendimentosTributaveis,
        rendimentos_isentos: formValues.rendimentosIsentos,
        contribuicao_previdenciaria: formValues.contribuicaoPrevidenciaria,
        despesas_medicas: formValues.despesasMedicas,
        despesas_educacao: formValues.despesasEducacao,
        pensao_alimenticia: formValues.pensaoAlimenticia,
        livro_caixa: formValues.livroCaixa,
        numero_dependentes: formValues.numeroDependentes,
        imposto_retido_fonte: formValues.impostoRetidoFonte,
        aposentado_65: formValues.ehAposentado65,
        tipo_declaracao: formValues.tipoDeclaracao,
        imposto_devido: formValues.tipoDeclaracao === 'completa' ? 
          result.impostoDevido.completo : result.impostoDevido.simplificado,
        saldo_imposto: result.saldoImposto,
        tipo_saldo: result.tipoSaldo,
        nome: formValues.nome,
        email: formValues.email,
        telefone: formValues.telefone,
        observacoes: formValues.observacoes,
        data_simulacao: new Date(),
      };
      
      const { error } = await supabase.from("tax_simulations").insert(simulationData);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Simulação enviada com sucesso!",
        description: "Nossa equipe analisará e entrará em contato.",
      });
      
      // Reset do formulário de contato
      setShowContactForm(false);
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

  // Gerar dados para o gráfico de distribuição de faixas
  const getBracketChartData = () => {
    if (!result) return [];
    
    return result.impostoFaixas.map(faixa => ({
      name: `Faixa ${faixa.faixa}`,
      valor: faixa.valorImposto,
      aliquota: `${(faixa.aliquota * 100).toFixed(1)}%`
    }));
  };
  
  // Gerar dados para o gráfico de comparação
  const getComparisonChartData = () => {
    if (!result) return [];
    
    return [
      { name: 'Completa', valor: result.impostoDevido.completo },
      { name: 'Simplificada', valor: result.impostoDevido.simplificado }
    ];
  };
  
  // Gerar dados para o gráfico de deduções
  const getDeductionsChartData = () => {
    if (!result) return [];
    
    const deducoes = result.detalhamentoDeducoes;
    return [
      { name: 'Dependentes', valor: deducoes.dependentes },
      { name: 'Previdência', valor: deducoes.previdencia },
      { name: 'Saúde', valor: deducoes.saude },
      { name: 'Educação', valor: deducoes.educacao },
      { name: 'Pensão', valor: deducoes.pensao },
      { name: 'Livro-Caixa', valor: deducoes.livroCaixa }
    ].filter(item => item.valor > 0);
  };
  
  // Cores para os gráficos
  const CHART_COLORS = {
    primary: ["#F5C441", "#e9b428", "#d6a417", "#c3950f", "#b08513", "#9d7517"],
    secondary: ["#0b1320", "#162338", "#21334f", "#2d4367", "#38547f", "#446597"],
  };

  return (
    <div className="bg-inherit min-h-screen">
      <div className="px-4 py-10">
        <div className="max-w-5xl mx-auto">
          <Card className="border-gold/30 shadow-lg dark:border-gold/20 overflow-hidden bg-white dark:bg-navy-dark mb-8">
            <CardHeader className="bg-white dark:bg-navy-dark">
              <CardTitle className="text-3xl font-bold text-navy dark:text-gold flex items-center gap-2">
                <Calculator className="h-8 w-8" />
                Simulador de Imposto de Renda 2024
              </CardTitle>
              <CardDescription className="text-lg text-navy/80 dark:text-white/80">
                Faça uma simulação completa do seu Imposto de Renda com base nas regras atualizadas da Receita Federal
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="mt-2"
              >
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="formulario" className="text-base">Formulário</TabsTrigger>
                  <TabsTrigger value="resultados" className="text-base" disabled={!result}>
                    Resultados
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="formulario">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                      <div className="space-y-6">
                        {/* Seção de Rendimentos */}
                        <div>
                          <h3 className="text-lg font-medium text-navy dark:text-gold mb-4">
                            Rendimentos
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Rendimentos Tributáveis */}
                            <FormField
                              control={form.control}
                              name="rendimentosTributaveis"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center gap-2">
                                    <FormLabel>Rendimentos Tributáveis (R$)</FormLabel>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <HelpCircle size={16} className="text-navy/60 dark:text-white/60" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p>Salários, pró-labore, aluguéis recebidos, rendimentos de autônomos, etc.</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="0,00"
                                      {...field}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            
                            {/* Rendimentos Isentos */}
                            <FormField
                              control={form.control}
                              name="rendimentosIsentos"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center gap-2">
                                    <FormLabel>Rendimentos Isentos (R$)</FormLabel>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <HelpCircle size={16} className="text-navy/60 dark:text-white/60" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p>FGTS, seguro-desemprego, parte isenta de aposentadoria para maiores de 65 anos, etc.</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="0,00"
                                      {...field}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            
                            {/* Imposto Retido na Fonte */}
                            <FormField
                              control={form.control}
                              name="impostoRetidoFonte"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center gap-2">
                                    <FormLabel>Imposto Retido na Fonte (R$)</FormLabel>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <HelpCircle size={16} className="text-navy/60 dark:text-white/60" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p>Total de imposto de renda retido na fonte durante o ano.</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="0,00"
                                      {...field}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            
                            {/* Aposentado acima de 65 anos */}
                            <FormField
                              control={form.control}
                              name="ehAposentado65"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 mt-8">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel>
                                      Aposentado(a) acima de 65 anos
                                    </FormLabel>
                                    <FormDescription>
                                      Recebe isenção parcial (até R$ {currencyFormat(TAX_CONSTANTS.ISENCAO_APOSENTADOS_65)}/ano)
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        {/* Seção de Deduções */}
                        <div>
                          <h3 className="text-lg font-medium text-navy dark:text-gold mb-4">
                            Deduções
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Contribuição Previdenciária */}
                            <FormField
                              control={form.control}
                              name="contribuicaoPrevidenciaria"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center gap-2">
                                    <FormLabel>Contribuição Previdenciária (R$)</FormLabel>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <HelpCircle size={16} className="text-navy/60 dark:text-white/60" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p>INSS, previdência pública (não inclui PGBL aqui).</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="0,00"
                                      {...field}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            
                            {/* Despesas Médicas */}
                            <FormField
                              control={form.control}
                              name="despesasMedicas"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center gap-2">
                                    <FormLabel>Despesas Médicas (R$)</FormLabel>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <HelpCircle size={16} className="text-navy/60 dark:text-white/60" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p>Médicos, dentistas, psicólogos, hospitais, planos de saúde, etc.</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="0,00"
                                      {...field}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            
                            {/* Despesas com Educação */}
                            <FormField
                              control={form.control}
                              name="despesasEducacao"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center gap-2">
                                    <FormLabel>Despesas com Educação (R$)</FormLabel>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <HelpCircle size={16} className="text-navy/60 dark:text-white/60" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p>Ensino infantil, fundamental, médio, técnico e superior (limite de R$ {currencyFormat(TAX_CONSTANTS.LIMITE_EDUCACAO)} por pessoa).</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="0,00"
                                      {...field}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            
                            {/* Número de Dependentes */}
                            <FormField
                              control={form.control}
                              name="numeroDependentes"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center gap-2">
                                    <FormLabel>Número de Dependentes</FormLabel>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <HelpCircle size={16} className="text-navy/60 dark:text-white/60" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p>Dedução de R$ {currencyFormat(TAX_CONSTANTS.DEDUCAO_POR_DEPENDENTE)} por dependente.</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="1"
                                      min="0"
                                      placeholder="0"
                                      {...field}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            
                            {/* Pensão Alimentícia */}
                            <FormField
                              control={form.control}
                              name="pensaoAlimenticia"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center gap-2">
                                    <FormLabel>Pensão Alimentícia Judicial (R$)</FormLabel>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <HelpCircle size={16} className="text-navy/60 dark:text-white/60" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p>Apenas pensão alimentícia estabelecida judicialmente.</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="0,00"
                                      {...field}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            
                            {/* Livro-Caixa */}
                            <FormField
                              control={form.control}
                              name="livroCaixa"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center gap-2">
                                    <FormLabel>Despesas Livro-Caixa (R$)</FormLabel>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <HelpCircle size={16} className="text-navy/60 dark:text-white/60" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p>Despesas relacionadas à atividade profissional autônoma.</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="0,00"
                                      {...field}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        {/* Tipo de Declaração */}
                        <div>
                          <h3 className="text-lg font-medium text-navy dark:text-gold mb-4">
                            Modelo de Declaração
                          </h3>
                          <FormField
                            control={form.control}
                            name="tipoDeclaracao"
                            render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex flex-col space-y-1"
                                  >
                                    <div className="flex items-center space-x-3 space-y-0">
                                      <RadioGroupItem value="completa" id="completa" />
                                      <FormLabel className="font-normal" htmlFor="completa">
                                        Modelo Completo (com deduções específicas)
                                      </FormLabel>
                                    </div>
                                    <div className="flex items-center space-x-3 space-y-0">
                                      <RadioGroupItem value="simplificada" id="simplificada" />
                                      <FormLabel className="font-normal" htmlFor="simplificada">
                                        Modelo Simplificado (desconto padrão de 20%, limitado a {currencyFormat(TAX_CONSTANTS.DESCONTO_SIMPLIFICADO_TETO)})
                                      </FormLabel>
                                    </div>
                                  </RadioGroup>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-center">
                        <Button type="submit" size="lg" className="min-w-[200px] text-base">
                          Calcular Imposto de Renda
                        </Button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>
                
                <TabsContent value="resultados" id="resultados" className="space-y-8 scroll-mt-8">
                  {result && (
                    <>
                      {/* Resumo do resultado */}
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-navy dark:text-gold mb-2">
                          Resultado da Simulação
                        </h2>
                        
                        {/* Card com recomendação e valor final */}
                        <Card className="mt-6 bg-white dark:bg-navy-darker border-[1.5px] border-gold/30">
                          <CardContent className="pt-6">
                            <div className="mb-4">
                              <Badge 
                                className={`text-sm ${
                                  result.declaracaoRecomendada === 'completa'
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300'
                                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
                                }`}
                              >
                                Modelo recomendado: {result.declaracaoRecomendada === 'completa' ? 'Completo' : 'Simplificado'}
                              </Badge>
                            </div>
                            
                            <div className="text-center mb-6">
                              <p className="text-navy/70 dark:text-white/70 mb-1">Com base nas informações fornecidas, você terá:</p>
                              <div className="inline-flex items-center justify-center">
                                <div className={`text-4xl font-bold ${
                                  result.tipoSaldo === 'pagar' 
                                    ? 'text-red-600 dark:text-red-400'
                                    : result.tipoSaldo === 'restituir'
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-navy dark:text-white'
                                }`}>
                                  {currencyFormat(result.saldoImposto)}
                                </div>
                              </div>
                              <p className={`text-xl ${
                                result.tipoSaldo === 'pagar' 
                                  ? 'text-red-600 dark:text-red-400'
                                  : result.tipoSaldo === 'restituir'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-navy dark:text-white'
                              }`}>
                                {result.tipoSaldo === 'pagar' && 'a pagar'}
                                {result.tipoSaldo === 'restituir' && 'a restituir'}
                                {result.tipoSaldo === 'zero' && 'sem saldo'}
                              </p>
                            </div>
                            
                            <Alert className="bg-blue-50/50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/30">
                              <InfoIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              <AlertDescription className="text-blue-800 dark:text-blue-300">
                                Esta simulação considera o modelo de declaração {form.getValues('tipoDeclaracao') === 'completa' ? 'completo' : 'simplificado'}.
                                {result.declaracaoRecomendada !== form.getValues('tipoDeclaracao') && (
                                  <span className="block mt-1 font-medium">
                                    Recomendamos usar o modelo {result.declaracaoRecomendada === 'completa' ? 'completo' : 'simplificado'} para otimizar seu resultado.
                                  </span>
                                )}
                              </AlertDescription>
                            </Alert>
                          </CardContent>
                        </Card>
                        
                        {/* Tabs para detalhar os resultados */}
                        <div className="mt-8">
                          <Tabs defaultValue="detalhamento" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="detalhamento">Detalhamento</TabsTrigger>
                              <TabsTrigger value="comparacao">Comparação</TabsTrigger>
                              <TabsTrigger value="graficos">Gráficos</TabsTrigger>
                            </TabsList>
                            
                            {/* Detalhamento */}
                            <TabsContent value="detalhamento" className="mt-4">
                              <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="base-calculo">
                                  <AccordionTrigger className="text-navy dark:text-gold">
                                    Base de Cálculo
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="space-y-2">
                                      <div className="flex justify-between py-2 border-b border-gray-200 dark:border-navy-lighter">
                                        <span>Rendimentos Tributáveis:</span>
                                        <span className="font-medium">{currencyFormat(form.getValues('rendimentosTributaveis'))}</span>
                                      </div>
                                      
                                      {form.getValues('ehAposentado65') && (
                                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-navy-lighter">
                                          <span>Parcela Isenta de Aposentadoria (65+ anos):</span>
                                          <span className="font-medium">- {currencyFormat(Math.min(form.getValues('rendimentosTributaveis'), TAX_CONSTANTS.ISENCAO_APOSENTADOS_65))}</span>
                                        </div>
                                      )}
                                      
                                      {form.getValues('tipoDeclaracao') === 'completa' && (
                                        <>
                                          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-navy-lighter">
                                            <span>Dedução de Dependentes ({form.getValues('numeroDependentes')} × {currencyFormat(TAX_CONSTANTS.DEDUCAO_POR_DEPENDENTE)}):</span>
                                            <span className="font-medium">- {currencyFormat(result.detalhamentoDeducoes.dependentes)}</span>
                                          </div>
                                          
                                          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-navy-lighter">
                                            <span>Dedução de Previdência:</span>
                                            <span className="font-medium">- {currencyFormat(result.detalhamentoDeducoes.previdencia)}</span>
                                          </div>
                                          
                                          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-navy-lighter">
                                            <span>Dedução de Despesas Médicas:</span>
                                            <span className="font-medium">- {currencyFormat(result.detalhamentoDeducoes.saude)}</span>
                                          </div>
                                          
                                          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-navy-lighter">
                                            <span>Dedução de Educação:</span>
                                            <span className="font-medium">- {currencyFormat(result.detalhamentoDeducoes.educacao)}</span>
                                          </div>
                                          
                                          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-navy-lighter">
                                            <span>Dedução de Pensão Alimentícia:</span>
                                            <span className="font-medium">- {currencyFormat(result.detalhamentoDeducoes.pensao)}</span>
                                          </div>
                                          
                                          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-navy-lighter">
                                            <span>Dedução de Livro-Caixa:</span>
                                            <span className="font-medium">- {currencyFormat(result.detalhamentoDeducoes.livroCaixa)}</span>
                                          </div>
                                          
                                          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-navy-lighter font-medium">
                                            <span>Total de Deduções:</span>
                                            <span>- {currencyFormat(result.descontoCompleto)}</span>
                                          </div>
                                        </>
                                      )}
                                      
                                      {form.getValues('tipoDeclaracao') === 'simplificada' && (
                                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-navy-lighter">
                                          <span>Desconto Simplificado (20% limitado a {currencyFormat(TAX_CONSTANTS.DESCONTO_SIMPLIFICADO_TETO)}):</span>
                                          <span className="font-medium">- {currencyFormat(result.descontoSimplificado)}</span>
                                        </div>
                                      )}
                                      
                                      <div className="flex justify-between py-2 font-semibold">
                                        <span>Base de Cálculo Final:</span>
                                        <span>{currencyFormat(form.getValues('tipoDeclaracao') === 'completa' ? result.baseDeCalculo.completa : result.baseDeCalculo.simplificada)}</span>
                                      </div>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                                
                                <AccordionItem value="calculo-imposto">
                                  <AccordionTrigger className="text-navy dark:text-gold">
                                    Cálculo do Imposto
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="space-y-2">
                                      <div className="mb-4">
                                        <h4 className="font-medium mb-2">Tabela Progressiva do IRPF (mensal):</h4>
                                        <div className="overflow-x-auto">
                                          <table className="min-w-full divide-y divide-gray-200 dark:divide-navy-lighter">
                                            <thead>
                                              <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Base de cálculo</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Alíquota</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dedução</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-navy-lighter">
                                              {TAX_CONSTANTS.FAIXAS_IRPF.map((faixa, index) => (
                                                <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-navy-dark' : 'bg-gray-50 dark:bg-navy-darker'}>
                                                  <td className="px-4 py-2 text-sm">
                                                    {index === 0 
                                                      ? `Até R$ ${faixa.limite.toFixed(2)}`
                                                      : index === TAX_CONSTANTS.FAIXAS_IRPF.length - 1
                                                        ? `Acima de R$ ${TAX_CONSTANTS.FAIXAS_IRPF[index - 1].limite.toFixed(2)}`
                                                        : `De R$ ${TAX_CONSTANTS.FAIXAS_IRPF[index - 1].limite.toFixed(2)} até R$ ${faixa.limite.toFixed(2)}`
                                                    }
                                                  </td>
                                                  <td className="px-4 py-2 text-sm">{(faixa.aliquota * 100).toFixed(1)}%</td>
                                                  <td className="px-4 py-2 text-sm">R$ {faixa.deducao.toFixed(2)}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                      
                                      <h4 className="font-medium mb-2">Cálculo por faixa:</h4>
                                      
                                      {result.impostoFaixas.length > 0 ? (
                                        <div className="space-y-2">
                                          {result.impostoFaixas.map((faixa, index) => (
                                            <div key={index} className="flex justify-between py-2 border-b border-gray-200 dark:border-navy-lighter">
                                              <span>Faixa {faixa.faixa} ({(faixa.aliquota * 100).toFixed(1)}%):</span>
                                              <span className="font-medium">{currencyFormat(faixa.valorImposto)}</span>
                                            </div>
                                          ))}
                                          
                                          <div className="flex justify-between py-2 font-semibold">
                                            <span>Imposto Devido Total:</span>
                                            <span>{currencyFormat(form.getValues('tipoDeclaracao') === 'completa' ? result.impostoDevido.completo : result.impostoDevido.simplificado)}</span>
                                          </div>
                                          
                                          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-navy-lighter">
                                            <span>Imposto Retido na Fonte:</span>
                                            <span className="font-medium">- {currencyFormat(result.impostoRetidoFonte)}</span>
                                          </div>
                                          
                                          <div className={`flex justify-between py-2 font-bold ${
                                            result.tipoSaldo === 'pagar' 
                                              ? 'text-red-600 dark:text-red-400'
                                              : result.tipoSaldo === 'restituir'
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-navy dark:text-white'
                                          }`}>
                                            <span>
                                              {result.tipoSaldo === 'pagar' && 'Imposto a Pagar:'}
                                              {result.tipoSaldo === 'restituir' && 'Imposto a Restituir:'}
                                              {result.tipoSaldo === 'zero' && 'Saldo de Imposto:'}
                                            </span>
                                            <span>
                                              {result.tipoSaldo === 'restituir' && '- '}
                                              {currencyFormat(result.saldoImposto)}
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-navy/80 dark:text-white/80">
                                          Não há imposto devido (isento).
                                        </p>
                                      )}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                                
                                <AccordionItem value="comparativo">
                                  <AccordionTrigger className="text-navy dark:text-gold">
                                    Comparativo entre Modelos
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Card className={result.declaracaoRecomendada === 'completa' ? 'border-green-500 dark:border-green-600 shadow-md' : ''}>
                                          <CardHeader className="pb-2">
                                            <CardTitle className="text-lg flex items-center">
                                              Modelo Completo
                                              {result.declaracaoRecomendada === 'completa' && (
                                                <span className="ml-2 p-1 bg-green-100 text-green-700 dark:bg-green-800/30 dark:text-green-400 text-xs rounded-full flex items-center">
                                                  <Check size={12} className="mr-1" /> 
                                                  Recomendado
                                                </span>
                                              )}
                                            </CardTitle>
                                          </CardHeader>
                                          <CardContent className="pt-2">
                                            <div className="space-y-2">
                                              <div className="flex justify-between py-1">
                                                <span>Base de Cálculo:</span>
                                                <span>{currencyFormat(result.baseDeCalculo.completa)}</span>
                                              </div>
                                              <div className="flex justify-between py-1">
                                                <span>Deduções Totais:</span>
                                                <span>{currencyFormat(result.descontoCompleto)}</span>
                                              </div>
                                              <div className="flex justify-between py-1 font-medium">
                                                <span>Imposto Devido:</span>
                                                <span>{currencyFormat(result.impostoDevido.completo)}</span>
                                              </div>
                                            </div>
                                          </CardContent>
                                        </Card>
                                        
                                        <Card className={result.declaracaoRecomendada === 'simplificada' ? 'border-green-500 dark:border-green-600 shadow-md' : ''}>
                                          <CardHeader className="pb-2">
                                            <CardTitle className="text-lg flex items-center">
                                              Modelo Simplificado
                                              {result.declaracaoRecomendada === 'simplificada' && (
                                                <span className="ml-2 p-1 bg-green-100 text-green-700 dark:bg-green-800/30 dark:text-green-400 text-xs rounded-full flex items-center">
                                                  <Check size={12} className="mr-1" /> 
                                                  Recomendado
                                                </span>
                                              )}
                                            </CardTitle>
                                          </CardHeader>
                                          <CardContent className="pt-2">
                                            <div className="space-y-2">
                                              <div className="flex justify-between py-1">
                                                <span>Base de Cálculo:</span>
                                                <span>{currencyFormat(result.baseDeCalculo.simplificada)}</span>
                                              </div>
                                              <div className="flex justify-between py-1">
                                                <span>Desconto Simplificado:</span>
                                                <span>{currencyFormat(result.descontoSimplificado)}</span>
                                              </div>
                                              <div className="flex justify-between py-1 font-medium">
                                                <span>Imposto Devido:</span>
                                                <span>{currencyFormat(result.impostoDevido.simplificado)}</span>
                                              </div>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      </div>
                                      
                                      <Alert>
                                        <AlertTriangle className="h-5 w-5" />
                                        <AlertDescription>
                                          <p className="text-sm">
                                            A declaração {result.declaracaoRecomendada === 'completa' ? 'completa' : 'simplificada'} resulta 
                                            em uma economia de {currencyFormat(Math.abs(result.impostoDevido.completo - result.impostoDevido.simplificado))} em relação à 
                                            {result.declaracaoRecomendada === 'completa' ? ' simplificada' : ' completa'}.
                                          </p>
                                          <p className="text-sm mt-1">
                                            O modelo recomendado é o que resulta em menor valor de imposto devido.
                                          </p>
                                        </AlertDescription>
                                      </Alert>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            </TabsContent>
                            
                            {/* Comparação */}
                            <TabsContent value="comparacao" className="mt-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">Deduções Detalhadas</CardTitle>
                                  </CardHeader>
                                  <CardContent className="pt-4 pb-2">
                                    <ul className="space-y-2">
                                      <li className="flex justify-between py-1 border-b border-gray-200 dark:border-navy-lighter">
                                        <span>Dependentes:</span>
                                        <span>{currencyFormat(result.detalhamentoDeducoes.dependentes)}</span>
                                      </li>
                                      <li className="flex justify-between py-1 border-b border-gray-200 dark:border-navy-lighter">
                                        <span>Previdência:</span>
                                        <span>{currencyFormat(result.detalhamentoDeducoes.previdencia)}</span>
                                      </li>
                                      <li className="flex justify-between py-1 border-b border-gray-200 dark:border-navy-lighter">
                                        <span>Saúde:</span>
                                        <span>{currencyFormat(result.detalhamentoDeducoes.saude)}</span>
                                      </li>
                                      <li className="flex justify-between py-1 border-b border-gray-200 dark:border-navy-lighter">
                                        <span>Educação:</span>
                                        <span>{currencyFormat(result.detalhamentoDeducoes.educacao)}</span>
                                      </li>
                                      <li className="flex justify-between py-1 border-b border-gray-200 dark:border-navy-lighter">
                                        <span>Pensão Alimentícia:</span>
                                        <span>{currencyFormat(result.detalhamentoDeducoes.pensao)}</span>
                                      </li>
                                      <li className="flex justify-between py-1 border-b border-gray-200 dark:border-navy-lighter">
                                        <span>Livro-Caixa:</span>
                                        <span>{currencyFormat(result.detalhamentoDeducoes.livroCaixa)}</span>
                                      </li>
                                      <li className="flex justify-between py-1 font-medium">
                                        <span>Total Deduções (Completa):</span>
                                        <span>{currencyFormat(result.descontoCompleto)}</span>
                                      </li>
                                      <li className="flex justify-between py-1 font-medium mt-2">
                                        <span>Desconto Simplificado:</span>
                                        <span>{currencyFormat(result.descontoSimplificado)}</span>
                                      </li>
                                    </ul>
                                    
                                    {/* Indicador de qual desconto é maior */}
                                    <div className="mt-4 p-2 rounded-md bg-gray-50 dark:bg-navy-deeper text-center">
                                      <p className="text-sm">
                                        {result.descontoCompleto > result.descontoSimplificado ? (
                                          <span>As deduções completas são <strong>maiores</strong> que o desconto simplificado</span>
                                        ) : (
                                          <span>O desconto simplificado é <strong>maior</strong> que as deduções completas</span>
                                        )}
                                      </p>
                                    </div>
                                  </CardContent>
                                </Card>
                                
                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">Faixas do IRPF Aplicadas</CardTitle>
                                  </CardHeader>
                                  <CardContent className="pt-4 pb-2">
                                    {result.impostoFaixas.length > 0 ? (
                                      <ul className="space-y-2">
                                        {result.impostoFaixas.map((faixa, index) => (
                                          <li key={index} className="flex justify-between py-1 border-b border-gray-200 dark:border-navy-lighter">
                                            <span>Faixa {faixa.faixa} ({(faixa.aliquota * 100).toFixed(1)}%):</span>
                                            <span>{currencyFormat(faixa.valorImposto)}</span>
                                          </li>
                                        ))}
                                        <li className="flex justify-between py-1 font-medium">
                                          <span>Imposto Total:</span>
                                          <span>{currencyFormat(form.getValues('tipoDeclaracao') === 'completa' ? result.impostoDevido.completo : result.impostoDevido.simplificado)}</span>
                                        </li>
                                      </ul>
                                    ) : (
                                      <div className="text-center py-8">
                                        <p>Isento de Imposto de Renda</p>
                                        <p className="text-sm text-navy/70 dark:text-white/70 mt-1">
                                          Não há valor a ser calculado nas faixas do IRPF
                                        </p>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              </div>
                            </TabsContent>
                            
                            {/* Gráficos */}
                            <TabsContent value="graficos" className="mt-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Gráfico de Comparação entre Modelos */}
                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">Comparação entre Modelos</CardTitle>
                                  </CardHeader>
                                  <CardContent className="pt-4">
                                    <div className="w-full h-[300px]">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={getComparisonChartData()}>
                                          <CartesianGrid strokeDasharray="3 3" />
                                          <XAxis dataKey="name" />
                                          <YAxis />
                                          <RechartsTooltip formatter={(value) => currencyFormat(Number(value))} />
                                          <Bar dataKey="valor" fill="#F5C441" />
                                        </BarChart>
                                      </ResponsiveContainer>
                                    </div>
                                  </CardContent>
                                </Card>
                                
                                {/* Gráfico de Distribuição por Faixas ou Deduções */}
                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">
                                      {result.impostoFaixas.length > 0 ? 'Distribuição por Faixas' : 'Distribuição de Deduções'}
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="pt-4">
                                    <div className="w-full h-[300px]">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                          <Pie
                                            data={result.impostoFaixas.length > 0 ? getBracketChartData() : getDeductionsChartData()}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={90}
                                            dataKey="valor"
                                          >
                                            {(result.impostoFaixas.length > 0 ? getBracketChartData() : getDeductionsChartData()).map((entry, index) => (
                                              <Cell 
                                                key={`cell-${index}`} 
                                                fill={result.impostoFaixas.length > 0 ? 
                                                  CHART_COLORS.primary[index % CHART_COLORS.primary.length] : 
                                                  CHART_COLORS.secondary[index % CHART_COLORS.secondary.length]
                                                }
                                              />
                                            ))}
                                          </Pie>
                                          <RechartsTooltip formatter={(value) => currencyFormat(Number(value))} />
                                          <Legend />
                                        </PieChart>
                                      </ResponsiveContainer>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>
                      </div>
                      
                      {/* Ações para usuários logados ou não */}
                      <div className="flex flex-col gap-4 mt-8">
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                          <Button 
                            onClick={exportToPDF}
                            variant="outline"
                            className="flex items-center justify-center gap-2"
                          >
                            <Download size={18} />
                            Exportar para PDF
                          </Button>
                          {user ? (
                            <Button 
                              onClick={saveSimulation} 
                              className="flex items-center justify-center gap-2"
                            >
                              <Send size={18} />
                              Enviar para análise da WS
                            </Button>
                          ) : (
                            <Button 
                              onClick={() => setShowContactForm(!showContactForm)} 
                              className="flex items-center justify-center gap-2"
                            >
                              <FileCheck size={18} />
                              {showContactForm ? 'Ocultar formulário' : 'Solicitar análise personalizada'}
                            </Button>
                          )}
                        </div>
                        
                        {/* Formulário de contato para não logados */}
                        {showContactForm && !user && (
                          <Card className="border-gold/20 mt-4">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-xl">Seus dados para contato</CardTitle>
                              <CardDescription>
                                Preencha os campos abaixo para enviar sua simulação para análise da nossa equipe
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="nome"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Nome completo</FormLabel>
                                        <FormControl>
                                          <Input {...field} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                          <Input type="email" {...field} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="telefone"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Telefone</FormLabel>
                                        <FormControl>
                                          <Input {...field} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                
                                <FormField
                                  control={form.control}
                                  name="observacoes"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Observações ou dúvidas</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Tem alguma dúvida ou informação adicional para nossa equipe?"
                                          className="min-h-[100px]"
                                          {...field}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                              <Button variant="outline" onClick={() => setShowContactForm(false)}>
                                Cancelar
                              </Button>
                              <Button onClick={saveSimulation}>
                                Enviar simulação
                              </Button>
                            </CardFooter>
                          </Card>
                        )}
                        
                        {/* Links e outras opções */}
                        <div className="text-center mt-4">
                          <p className="text-navy/70 dark:text-white/70 text-sm mb-2">
                            Para mais informações, fale diretamente com nossa equipe:
                          </p>
                          <Button variant="link" onClick={contactWhatsApp}>
                            Entre em contato via WhatsApp
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TaxCalculator;
