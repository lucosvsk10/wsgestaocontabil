
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "./StepIndicator";
import { IncomeStep } from "./IncomeStep";
import { DeductionsStep } from "./DeductionsStep";
import { ResultsStep } from "./ResultsStep";
import { calculateFullTaxResult, currencyFormat } from "@/utils/tax";
import { mapTaxFormToSupabase } from "@/utils/formDataMappers";
import { formSchema, TaxFormValues, TaxFormInput } from "@/types/taxCalculator";

const TaxCalculatorForm = () => {
  const [step, setStep] = useState(1);
  const [showResult, setShowResult] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [taxResult, setTaxResult] = useState<any>(null);
  const { user, userData } = useAuthContext();
  const { toast } = useToast();

  const { control, handleSubmit: hookFormSubmit, watch, setValue, formState: { errors, isValid } } = useForm<TaxFormValues>({
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
        const result = calculateFullTaxResult(formData as TaxFormInput);
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
      const result = calculateFullTaxResult(formData as TaxFormInput);
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

  return (
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
          {step === 1 && <IncomeStep control={control} errors={errors} />}
          {step === 2 && <DeductionsStep control={control} errors={errors} taxResult={taxResult} formData={formData} />}
          {step === 3 && <ResultsStep taxResult={taxResult} formData={formData} user={user} formatCurrency={currencyFormat} />}
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
  );
};

export default TaxCalculatorForm;
