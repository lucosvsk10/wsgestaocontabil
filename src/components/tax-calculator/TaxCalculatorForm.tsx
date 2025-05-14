
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
import { calculateTaxBrackets, calculateTaxByBrackets } from '@/utils/tax/calculations';

// Function to calculate tax results based on form data
const calculateTaxes = (data: TaxFormInput): TaxResult => {
  // Calculate base for complete declaration
  const totalDeductions = data.contribuicaoPrevidenciaria + 
                        Math.min(data.despesasEducacao, 3561.50 * (data.numeroDependentes + 1)) +
                        data.despesasMedicas + 
                        (data.numeroDependentes * 2275.08) +
                        data.pensaoAlimenticia +
                        data.livroCaixa;
  
  // Complete declaration base calculation
  const baseCompleta = Math.max(0, data.rendimentosTributaveis - totalDeductions);
  
  // Simplified declaration base calculation (20% discount up to R$ 16.754,34)
  const descontoSimplificado = Math.min(data.rendimentosTributaveis * 0.2, 16754.34);
  const baseSimplificada = Math.max(0, data.rendimentosTributaveis - descontoSimplificado);
  
  // Calculate tax for both methods
  const impostoCompleto = calculateTaxBrackets(baseCompleta);
  const impostoSimplificado = calculateTaxBrackets(baseSimplificada);
  
  // Determine which method is better
  const declaracaoRecomendada = impostoCompleto <= impostoSimplificado ? 'completa' : 'simplificada';
  
  // Calculate balance (to pay or to be refunded)
  const impostoFinal = declaracaoRecomendada === 'completa' ? impostoCompleto : impostoSimplificado;
  const saldoImposto = impostoFinal - data.impostoRetidoFonte;
  
  let tipoSaldo: 'pagar' | 'restituir' | 'zero' = 'zero';
  if (saldoImposto > 0) tipoSaldo = 'pagar';
  else if (saldoImposto < 0) tipoSaldo = 'restituir';
  
  // Generate tax brackets breakdown
  const impostoFaixas = calculateTaxByBrackets(
    declaracaoRecomendada === 'completa' ? baseCompleta : baseSimplificada
  );
  
  return {
    baseDeCalculo: {
      completa: baseCompleta,
      simplificada: baseSimplificada
    },
    descontoSimplificado,
    descontoCompleto: totalDeductions,
    impostoDevido: {
      completo: impostoCompleto,
      simplificado: impostoSimplificado
    },
    declaracaoRecomendada,
    saldoImposto,
    tipoSaldo,
    impostoFaixas,
    detalhamentoDeducoes: {
      dependentes: data.numeroDependentes * 2275.08,
      previdencia: data.contribuicaoPrevidenciaria,
      saude: data.despesasMedicas,
      educacao: Math.min(data.despesasEducacao, 3561.50 * (data.numeroDependentes + 1)),
      pensao: data.pensaoAlimenticia,
      livroCaixa: data.livroCaixa,
      total: totalDeductions
    },
    impostoRetidoFonte: data.impostoRetidoFonte
  };
};

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
  
  const onSubmit = (data: TaxFormValues) => {
    if (activeStep < 2) {
      setActiveStep(activeStep + 1);
      return;
    }
    
    // Calculate tax result
    const result = calculateTaxes(data);
    setTaxResult(result);
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
      <StepIndicator activeStep={activeStep} />
      
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
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
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={handlePrevious}
                className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-navy-lighter dark:text-white rounded"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gold hover:bg-gold/90 text-navy rounded"
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
