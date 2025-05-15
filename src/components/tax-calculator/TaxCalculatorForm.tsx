
import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { StepIndicator } from './StepIndicator';
import { IncomeStep } from './IncomeStep';
import { DeductionsStep } from './DeductionsStep';
import { ResultsStep } from './ResultsStep';
import { TaxCalculatorProps } from '@/types/taxCalculator';
import { TaxFormInput, TaxResult, TaxFormValues } from '@/utils/tax/types';
import { calculateTaxes } from '@/utils/tax/taxService';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';

// Define the form schema
const createTaxFormSchema = (isLoggedIn: boolean) => {
  const baseSchema = z.object({
    rendimentosTributaveis: z.number().min(1, "Rendimentos tributáveis são obrigatórios"),
    rendimentosIsentos: z.number().nonnegative(),
    contribuicaoPrevidenciaria: z.number().nonnegative(),
    despesasMedicas: z.number().nonnegative(),
    despesasEducacao: z.number().nonnegative(),
    pensaoAlimenticia: z.number().nonnegative(),
    livroCaixa: z.number().nonnegative(),
    numeroDependentes: z.number().nonnegative().int(),
    impostoRetidoFonte: z.number().nonnegative(),
    ehAposentado65: z.boolean(),
    tipoDeclaracao: z.enum(['completa', 'simplificada']),
    previdenciaPrivada: z.number().nonnegative().optional()
  });

  // Add nome validation only if not logged in
  if (!isLoggedIn) {
    return baseSchema.extend({
      nome: z.string().min(2, "Nome é obrigatório para simulações anônimas"),
      email: z.string().email("Email inválido").optional().or(z.literal('')),
      telefone: z.string().optional().or(z.literal(''))
    });
  }
  
  return baseSchema.extend({
    nome: z.string().optional().or(z.literal('')),
    email: z.string().email("Email inválido").optional().or(z.literal('')),
    telefone: z.string().optional().or(z.literal(''))
  });
};

export const TaxCalculatorForm: React.FC<TaxCalculatorProps> = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [taxResult, setTaxResult] = useState<TaxResult | null>(null);
  const { user } = useAuth();
  const { createNotification } = useNotifications();
  const isLoggedIn = !!user;

  // Create form with schema based on login status
  const methods = useForm<TaxFormValues>({
    resolver: zodResolver(createTaxFormSchema(isLoggedIn)),
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
      previdenciaPrivada: 0,
      nome: '',
      email: '',
      telefone: ''
    }
  });
  
  const saveSimulation = async (data: TaxFormValues, result: TaxResult) => {
    try {
      const simulationData = {
        user_id: user?.id || null,
        nome: data.nome || null,
        email: data.email || null,
        telefone: data.telefone || null,
        rendimento_bruto: data.rendimentosTributaveis,
        rendimentos_isentos: data.rendimentosIsentos,
        inss: data.contribuicaoPrevidenciaria,
        educacao: data.despesasEducacao,
        saude: data.despesasMedicas,
        dependentes: data.numeroDependentes,
        outras_deducoes: data.pensaoAlimenticia + data.livroCaixa,
        imposto_estimado: result.saldoImposto,
        tipo_simulacao: result.tipoSaldo === 'pagar' ? 'a pagar' : 'restituição',
        observacoes: ''
      };

      const { error } = await supabase.from('tax_simulations').insert(simulationData);

      if (error) {
        console.error('Erro ao salvar simulação:', error);
        toast({
          title: "Erro ao salvar simulação",
          description: "Não foi possível salvar sua simulação. Por favor, tente novamente.",
          variant: "destructive"
        });
        return false;
      }

      // Criar notificação se o usuário estiver logado
      if (user) {
        createNotification(
          `Nova simulação de IRPF: ${result.tipoSaldo === 'pagar' ? 'Imposto a pagar' : 'Restituição'} de ${Math.abs(result.saldoImposto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
          'tax'
        );
      }

      toast({
        title: "Simulação salva com sucesso",
        description: "Sua simulação de IRPF foi armazenada e pode ser consultada posteriormente.",
        variant: "default"
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar simulação:', error);
      toast({
        title: "Erro ao salvar simulação",
        description: "Ocorreu um erro ao processar sua solicitação.",
        variant: "destructive"
      });
      return false;
    }
  };
  
  const onSubmit = async (data: TaxFormValues) => {
    if (activeStep < 2) {
      setActiveStep(activeStep + 1);
      return;
    }
    
    // Calculate tax result
    const result = calculateTaxes(data);
    setTaxResult(result);
    
    // Save the simulation
    await saveSimulation(data, result);
    
    setActiveStep(3); // Move to results step
    
    if (onComplete) {
      onComplete(result);
    }
  };
  
  const handlePrevious = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };
  
  const restartForm = () => {
    methods.reset();
    setTaxResult(null);
    setActiveStep(0);
  };

  return (
    <div className="w-full">
      <div className="p-6 bg-gray-50 dark:bg-navy-dark border-b border-gray-200 dark:border-navy-lighter/30">
        <StepIndicator activeStep={activeStep} />
      </div>
      
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="p-6">
          {activeStep === 0 && <IncomeStep isLoggedIn={isLoggedIn} />}
          
          {activeStep === 1 && (
            <DeductionsStep 
              control={methods.control}
              errors={methods.formState.errors}
              taxResult={taxResult}
              formData={methods.getValues()}
            />
          )}
          
          {activeStep === 2 && (
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={handlePrevious}
                className="px-6 py-2 bg-gray-200 text-gray-800 dark:bg-navy-lighter dark:text-white rounded-2xl hover:shadow-md transition-all"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="px-8 py-2 bg-gold hover:bg-gold/90 text-navy rounded-2xl hover:shadow-md transition-all"
              >
                Calcular
              </button>
            </div>
          )}
          
          {activeStep === 3 && taxResult && (
            <ResultsStep 
              taxResult={taxResult}
              formData={methods.getValues()}
              user={user}
              formatCurrency={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              onRestart={restartForm} 
            />
          )}
        </form>
      </FormProvider>
    </div>
  );
};

export default TaxCalculatorForm;
