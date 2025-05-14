import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { calculateFullTaxResult, currencyFormat } from "@/utils/taxCalculations";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoCircledIcon, CheckCircledIcon, CrossCircledIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { mapTaxFormToSupabase } from "@/utils/formDataMappers";
import { Badge } from "@/components/ui/badge";

// Esquema de validação para o formulário
const formSchema = z.object({
  rendimentosTributaveis: z.number().min(0, "Valor não pode ser negativo"),
  rendimentosIsentos: z.number().min(0, "Valor não pode ser negativo"),
  contribuicaoPrevidenciaria: z.number().min(0, "Valor não pode ser negativo"),
  despesasMedicas: z.number().min(0, "Valor não pode ser negativo"),
  despesasEducacao: z.number().min(0, "Valor não pode ser negativo"),
  pensaoAlimenticia: z.number().min(0, "Valor não pode ser negativo"),
  livroCaixa: z.number().min(0, "Valor não pode ser negativo"),
  numeroDependentes: z.number().int().min(0, "Valor não pode ser negativo"),
  impostoRetidoFonte: z.number().min(0, "Valor não pode ser negativo"),
  ehAposentado65: z.boolean().default(false),
  tipoDeclaracao: z.enum(["completa", "simplificada"]),
});

type FormValues = z.infer<typeof formSchema>;

const TaxCalculator = () => {
  const [step, setStep] = useState(1);
  const [showResult, setShowResult] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [taxResult, setTaxResult] = useState<any>(null);
  const { user, userData } = useAuthContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { control, handleSubmit: hookFormSubmit, watch, setValue, formState: { errors, isValid } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
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
      tipoDeclaracao: "completa",
    },
    mode: "onChange"
  });

  const formData = watch();

  // Efeito para calcular em tempo real
  useEffect(() => {
    if (isValid && step === 2) {
      try {
        const result = calculateFullTaxResult(formData);
        setTaxResult(result);
      } catch (error) {
        console.error("Erro ao calcular imposto:", error);
      }
    }
  }, [formData, isValid, step]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Validação adicional se necessário
    if (!isValid) {
      toast({
        title: "Formulário inválido",
        description: "Por favor, verifique os campos destacados.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      const result = calculateFullTaxResult(formData);
      setTaxResult(result);

      // Se o usuário estiver logado, salvar a simulação
      if (user) {
        // Preparando dados para o formato esperado pelo Supabase
        const supabaseData = mapTaxFormToSupabase({
          user_id: user.id,
          nome: userData?.name,
          email: userData?.email,
          telefone: "", // Não temos este dado no perfil, seria necessário adicionar
          ...formData,
          impostoDevido: result.impostoDevido[formData.tipoDeclaracao],
          tipoDeclaracaoRecomendada: result.declaracaoRecomendada,
        });

        const { data, error } = await supabase.from('tax_simulations').insert(supabaseData);

        if (error) {
          throw error;
        }

        toast({
          title: "Simulação salva com sucesso!",
          description: "Você pode consultar o histórico no seu perfil.",
        });
      }

      setShowResult(true);
      setStep(3); // Avançar para o passo de resultados
    } catch (error: any) {
      console.error("Erro ao salvar simulação:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar a simulação.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const resetForm = () => {
    setValue("rendimentosTributaveis", 0);
    setValue("rendimentosIsentos", 0);
    setValue("contribuicaoPrevidenciaria", 0);
    setValue("despesasMedicas", 0);
    setValue("despesasEducacao", 0);
    setValue("pensaoAlimenticia", 0);
    setValue("livroCaixa", 0);
    setValue("numeroDependentes", 0);
    setValue("impostoRetidoFonte", 0);
    setValue("ehAposentado65", false);
    setValue("tipoDeclaracao", "completa");
    setShowResult(false);
    setStep(1);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const renderStepIndicator = () => {
    return (
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-gold text-navy' : 'bg-gray-200 text-gray-500'}`}>
              1
            </div>
            <span className={`ml-2 ${step >= 1 ? 'text-navy dark:text-gold' : 'text-gray-500'}`}>Rendimentos</span>
          </div>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-gold text-navy' : 'bg-gray-200 text-gray-500'}`}>
              2
            </div>
            <span className={`ml-2 ${step >= 2 ? 'text-navy dark:text-gold' : 'text-gray-500'}`}>Deduções</span>
          </div>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-gold text-navy' : 'bg-gray-200 text-gray-500'}`}>
              3
            </div>
            <span className={`ml-2 ${step >= 3 ? 'text-navy dark:text-gold' : 'text-gray-500'}`}>Resultado</span>
          </div>
        </div>
        <Progress value={step * 33.33} className="h-2 bg-gray-200 dark:bg-navy-lighter" />
      </div>
    );
  };

  const renderStep1 = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Label htmlFor="rendimentosTributaveis">Rendimentos Tributáveis</Label>
            <Controller
              name="rendimentosTributaveis"
              control={control}
              render={({ field }) => (
                <Input
                  id="rendimentosTributaveis"
                  type="number"
                  placeholder="0,00"
                  {...field}
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className={errors.rendimentosTributaveis ? "border-red-500" : ""}
                />
              )}
            />
            {errors.rendimentosTributaveis && (
              <p className="text-red-500 text-sm">{errors.rendimentosTributaveis.message}</p>
            )}
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              Salários, aposentadoria, aluguéis, etc.
            </p>
          </div>

          <div className="space-y-4">
            <Label htmlFor="rendimentosIsentos">Rendimentos Isentos</Label>
            <Controller
              name="rendimentosIsentos"
              control={control}
              render={({ field }) => (
                <Input
                  id="rendimentosIsentos"
                  type="number"
                  placeholder="0,00"
                  {...field}
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className={errors.rendimentosIsentos ? "border-red-500" : ""}
                />
              )}
            />
            {errors.rendimentosIsentos && (
              <p className="text-red-500 text-sm">{errors.rendimentosIsentos.message}</p>
            )}
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              FGTS, seguro-desemprego, etc.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Label htmlFor="impostoRetidoFonte">Imposto Retido na Fonte</Label>
          <Controller
            name="impostoRetidoFonte"
            control={control}
            render={({ field }) => (
              <Input
                id="impostoRetidoFonte"
                type="number"
                placeholder="0,00"
                {...field}
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className={errors.impostoRetidoFonte ? "border-red-500" : ""}
              />
            )}
          />
          {errors.impostoRetidoFonte && (
            <p className="text-red-500 text-sm">{errors.impostoRetidoFonte.message}</p>
          )}
          <p className="text-sm text-muted-foreground dark:text-gray-400">
            Imposto já retido durante o ano (informe 0 se não houver)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Controller
            name="ehAposentado65"
            control={control}
            render={({ field }) => (
              <Switch
                id="ehAposentado65"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label htmlFor="ehAposentado65">Aposentado com 65 anos ou mais</Label>
        </div>

        <Alert className="bg-blue-50 dark:bg-navy-lighter border-blue-200 dark:border-navy-light">
          <InfoCircledIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-800 dark:text-blue-300">Dica</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-200">
            Informe todos os rendimentos recebidos durante o ano fiscal. Rendimentos isentos não entram no cálculo do imposto, mas devem ser declarados.
          </AlertDescription>
        </Alert>
      </div>
    );
  };

  const renderStep2 = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Label htmlFor="contribuicaoPrevidenciaria">Contribuição Previdenciária</Label>
            <Controller
              name="contribuicaoPrevidenciaria"
              control={control}
              render={({ field }) => (
                <Input
                  id="contribuicaoPrevidenciaria"
                  type="number"
                  placeholder="0,00"
                  {...field}
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className={errors.contribuicaoPrevidenciaria ? "border-red-500" : ""}
                />
              )}
            />
            {errors.contribuicaoPrevidenciaria && (
              <p className="text-red-500 text-sm">{errors.contribuicaoPrevidenciaria.message}</p>
            )}
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              INSS, previdência privada, etc.
            </p>
          </div>

          <div className="space-y-4">
            <Label htmlFor="despesasMedicas">Despesas Médicas</Label>
            <Controller
              name="despesasMedicas"
              control={control}
              render={({ field }) => (
                <Input
                  id="despesasMedicas"
                  type="number"
                  placeholder="0,00"
                  {...field}
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className={errors.despesasMedicas ? "border-red-500" : ""}
                />
              )}
            />
            {errors.despesasMedicas && (
              <p className="text-red-500 text-sm">{errors.despesasMedicas.message}</p>
            )}
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              Consultas, exames, plano de saúde, etc.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Label htmlFor="despesasEducacao">Despesas com Educação</Label>
            <Controller
              name="despesasEducacao"
              control={control}
              render={({ field }) => (
                <Input
                  id="despesasEducacao"
                  type="number"
                  placeholder="0,00"
                  {...field}
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className={errors.despesasEducacao ? "border-red-500" : ""}
                />
              )}
            />
            {errors.despesasEducacao && (
              <p className="text-red-500 text-sm">{errors.despesasEducacao.message}</p>
            )}
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              Mensalidades escolares, cursos, etc.
            </p>
          </div>

          <div className="space-y-4">
            <Label htmlFor="numeroDependentes">Número de Dependentes</Label>
            <Controller
              name="numeroDependentes"
              control={control}
              render={({ field }) => (
                <Input
                  id="numeroDependentes"
                  type="number"
                  placeholder="0"
                  {...field}
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className={errors.numeroDependentes ? "border-red-500" : ""}
                />
              )}
            />
            {errors.numeroDependentes && (
              <p className="text-red-500 text-sm">{errors.numeroDependentes.message}</p>
            )}
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              Filhos, cônjuge, pais, etc.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Label htmlFor="pensaoAlimenticia">Pensão Alimentícia</Label>
            <Controller
              name="pensaoAlimenticia"
              control={control}
              render={({ field }) => (
                <Input
                  id="pensaoAlimenticia"
                  type="number"
                  placeholder="0,00"
                  {...field}
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className={errors.pensaoAlimenticia ? "border-red-500" : ""}
                />
              )}
            />
            {errors.pensaoAlimenticia && (
              <p className="text-red-500 text-sm">{errors.pensaoAlimenticia.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <Label htmlFor="livroCaixa">Livro Caixa (Autônomos)</Label>
            <Controller
              name="livroCaixa"
              control={control}
              render={({ field }) => (
                <Input
                  id="livroCaixa"
                  type="number"
                  placeholder="0,00"
                  {...field}
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className={errors.livroCaixa ? "border-red-500" : ""}
                />
              )}
            />
            {errors.livroCaixa && (
              <p className="text-red-500 text-sm">{errors.livroCaixa.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Label>Modelo de Declaração</Label>
          <Controller
            name="tipoDeclaracao"
            control={control}
            render={({ field }) => (
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="completa" id="completa" />
                  <Label htmlFor="completa" className="font-normal">
                    Completa (com todas as deduções)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="simplificada" id="simplificada" />
                  <Label htmlFor="simplificada" className="font-normal">
                    Simplificada (desconto padrão de 20%, limitado a R$ 16.754,34)
                  </Label>
                </div>
              </RadioGroup>
            )}
          />
        </div>

        {taxResult && (
          <Alert className={`${taxResult.declaracaoRecomendada === formData.tipoDeclaracao ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30'}`}>
            <InfoCircledIcon className={`h-4 w-4 ${taxResult.declaracaoRecomendada === formData.tipoDeclaracao ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`} />
            <AlertTitle className={`${taxResult.declaracaoRecomendada === formData.tipoDeclaracao ? 'text-green-800 dark:text-green-300' : 'text-amber-800 dark:text-amber-300'}`}>
              {taxResult.declaracaoRecomendada === formData.tipoDeclaracao ? 'Boa escolha!' : 'Recomendação'}
            </AlertTitle>
            <AlertDescription className={`${taxResult.declaracaoRecomendada === formData.tipoDeclaracao ? 'text-green-700 dark:text-green-200' : 'text-amber-700 dark:text-amber-200'}`}>
              {taxResult.declaracaoRecomendada === formData.tipoDeclaracao
                ? `O modelo ${formData.tipoDeclaracao} é o mais vantajoso para você.`
                : `Recomendamos o modelo ${taxResult.declaracaoRecomendada} que resultaria em um imposto menor.`}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  const renderStep3 = () => {
    if (!taxResult) return null;

    const tipoDeclaracao = formData.tipoDeclaracao;
    const impostoDevido = taxResult.impostoDevido[tipoDeclaracao === 'completa' ? 'completo' : 'simplificado'];
    const saldoImposto = impostoDevido - formData.impostoRetidoFonte;
    const tipoSaldo = saldoImposto > 0 ? 'pagar' : saldoImposto < 0 ? 'restituir' : 'zero';

    return (
      <div className="space-y-8">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-2 dark:text-white">Resultado da Simulação</h3>
          <p className="text-muted-foreground dark:text-gray-300">
            Confira abaixo o resultado da sua simulação de Imposto de Renda
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-md dark:bg-navy-dark">
            <CardHeader>
              <CardTitle className="text-navy dark:text-gold">Resumo</CardTitle>
              <CardDescription className="dark:text-gray-300">
                Modelo de declaração: {tipoDeclaracao === 'completa' ? 'Completa' : 'Simplificada'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground dark:text-gray-300">Rendimentos tributáveis:</span>
                <span className="font-medium dark:text-white">{formatCurrency(formData.rendimentosTributaveis)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground dark:text-gray-300">Base de cálculo:</span>
                <span className="font-medium dark:text-white">
                  {formatCurrency(taxResult.baseDeCalculo[tipoDeclaracao === 'completa' ? 'completa' : 'simplificada'])}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground dark:text-gray-300">Imposto devido:</span>
                <span className="font-medium dark:text-white">{formatCurrency(impostoDevido)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground dark:text-gray-300">Imposto retido na fonte:</span>
                <span className="font-medium dark:text-white">{formatCurrency(formData.impostoRetidoFonte)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between items-center">
                <span className="font-medium dark:text-white">Saldo:</span>
                <div className="flex items-center">
                  <span className={`font-bold text-lg ${
                    tipoSaldo === 'pagar' ? 'text-red-500 dark:text-red-400' : 
                    tipoSaldo === 'restituir' ? 'text-green-500 dark:text-green-400' : 
                    'dark:text-white'
                  }`}>
                    {tipoSaldo === 'pagar' ? formatCurrency(saldoImposto) : 
                     tipoSaldo === 'restituir' ? formatCurrency(Math.abs(saldoImposto)) : 
                     formatCurrency(0)}
                  </span>
                  <Badge className={`ml-2 ${
                    tipoSaldo === 'pagar' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' : 
                    tipoSaldo === 'restituir' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' : 
                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}>
                    {tipoSaldo === 'pagar' ? 'A pagar' : 
                     tipoSaldo === 'restituir' ? 'A restituir' : 
                     'Zero'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-md dark:bg-navy-dark">
            <CardHeader>
              <CardTitle className="text-navy dark:text-gold">Deduções</CardTitle>
              <CardDescription className="dark:text-gray-300">
                {tipoDeclaracao === 'completa' ? 'Detalhamento das deduções' : 'Desconto simplificado'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tipoDeclaracao === 'completa' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-gray-300">Contribuição previdenciária:</span>
                    <span className="font-medium dark:text-white">{formatCurrency(formData.contribuicaoPrevidenciaria)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-gray-300">Despesas médicas:</span>
                    <span className="font-medium dark:text-white">{formatCurrency(formData.despesasMedicas)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-gray-300">Despesas com educação:</span>
                    <span className="font-medium dark:text-white">{formatCurrency(formData.despesasEducacao)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-gray-300">Dependentes ({formData.numeroDependentes}):</span>
                    <span className="font-medium dark:text-white">{formatCurrency(taxResult.detalhamentoDeducoes.dependentes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-gray-300">Pensão alimentícia:</span>
                    <span className="font-medium dark:text-white">{formatCurrency(formData.pensaoAlimenticia)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-gray-300">Livro caixa:</span>
                    <span className="font-medium dark:text-white">{formatCurrency(formData.livroCaixa)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-gray-300">Desconto simplificado (20%):</span>
                  <span className="font-medium dark:text-white">{formatCurrency(taxResult.descontoSimplificado)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="font-medium dark:text-white">Total de deduções:</span>
                <span className="font-bold dark:text-white">
                  {formatCurrency(tipoDeclaracao === 'completa' ? taxResult.descontoCompleto : taxResult.descontoSimplificado)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-md dark:bg-navy-dark">
          <CardHeader>
            <CardTitle className="text-navy dark:text-gold">Detalhamento por Faixas</CardTitle>
            <CardDescription className="dark:text-gray-300">
              Cálculo progressivo do imposto por faixas de renda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-navy-lighter/30">
                    <th className="text-left py-2 px-4 dark:text-gray-300">Faixa</th>
                    <th className="text-left py-2 px-4 dark:text-gray-300">Base de Cálculo</th>
                    <th className="text-left py-2 px-4 dark:text-gray-300">Alíquota</th>
                    <th className="text-left py-2 px-4 dark:text-gray-300">Valor do Imposto</th>
                  </tr>
                </thead>
                <tbody>
                  {taxResult.impostoFaixas.map((faixa: any, index: number) => (
                    <tr key={index} className="border-b dark:border-navy-lighter/30">
                      <td className="py-2 px-4 dark:text-white">{faixa.faixa}ª Faixa</td>
                      <td className="py-2 px-4 dark:text-white">{formatCurrency(faixa.baseCalculo)}</td>
                      <td className="py-2 px-4 dark:text-white">{(faixa.aliquota * 100).toFixed(1)}%</td>
                      <td className="py-2 px-4 dark:text-white">{formatCurrency(faixa.valorImposto)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 dark:bg-navy-dark">
                    <td className="py-2 px-4 font-medium dark:text-white">Total</td>
                    <td className="py-2 px-4 dark:text-white">{formatCurrency(taxResult.baseDeCalculo[tipoDeclaracao === 'completa' ? 'completa' : 'simplificada'])}</td>
                    <td className="py-2 px-4 dark:text-white">-</td>
                    <td className="py-2 px-4 font-medium dark:text-white">{formatCurrency(impostoDevido)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col space-y-4">
          <Alert className="bg-blue-50 dark:bg-navy-lighter border-blue-200 dark:border-navy-light">
            <InfoCircledIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-800 dark:text-blue-300">Importante</AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-200">
              Esta é apenas uma simulação. Para uma declaração oficial, consulte um contador ou utilize o programa oficial da Receita Federal.
            </AlertDescription>
          </Alert>

          {!user && (
            <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30">
              <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-800 dark:text-amber-300">Crie uma conta</AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-200">
                Para salvar suas simulações e receber orientações personalizadas, 
                <Button variant="link" className="p-0 h-auto text-amber-700 dark:text-amber-200 underline" onClick={() => navigate('/register')}>
                  crie uma conta
                </Button> ou 
                <Button variant="link" className="p-0 h-auto text-amber-700 dark:text-amber-200 underline" onClick={() => navigate('/login')}>
                  faça login
                </Button>.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-navy dark:text-gold">Simulador de Imposto de Renda</h1>
          <p className="text-muted-foreground dark:text-gray-300 mt-2">
            Calcule seu imposto de renda e descubra se você terá imposto a pagar ou restituição
          </p>
        </div>

        {renderStepIndicator()}

        <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-lg dark:bg-navy-medium">
          <CardHeader>
            <CardTitle className="text-navy dark:text-gold">
              {step === 1 ? "Rendimentos" : step === 2 ? "Deduções" : "Resultado"}
            </CardTitle>
            <CardDescription className="dark:text-gray-300">
              {step === 1 ? "Informe seus rendimentos anuais" : 
               step === 2 ? "Informe suas deduções" : 
               "Confira o resultado da sua simulação"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
            </form>
          </CardContent>
          <CardFooter className="flex justify-between">
            {step > 1 ? (
              <Button 
                type="button" 
                variant="outline" 
                onClick={prevStep}
                disabled={submitting}
              >
                Voltar
              </Button>
            ) : (
              <div></div>
            )}
            
            {step < 3 ? (
              <Button 
                type="button" 
                onClick={nextStep}
                disabled={submitting}
                className="bg-gold hover:bg-gold/90 text-black"
              >
                {step === 2 ? "Calcular" : "Próximo"}
              </Button>
            ) : (
              <Button 
                type="button" 
                onClick={resetForm}
                disabled={submitting}
                variant="outline"
              >
                Nova Simulação
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default TaxCalculator;
