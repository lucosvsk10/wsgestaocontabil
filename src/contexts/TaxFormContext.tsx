
import React, { createContext, useContext } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TaxFormValues, TaxResult } from '@/utils/tax/types';
import { useTaxCalculator } from '@/hooks/useTaxCalculator';

// Define the context type
interface TaxFormContextType {
  activeStep: number;
  taxResult: TaxResult | null;
  handleStepAdvance: () => void;
  handlePrevious: () => void;
  calculateAndSaveResult: (data: TaxFormValues) => Promise<TaxResult>;
  restartForm: () => boolean;
  methods: ReturnType<typeof useForm<TaxFormValues>>;
}

// Create the context
const TaxFormContext = createContext<TaxFormContextType | undefined>(undefined);

// Create a schema factory function
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
    previdenciaPrivada: z.number().nonnegative().optional(),
    user: z.any().optional()
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

// Create the provider component
interface TaxFormProviderProps {
  children: React.ReactNode;
  isLoggedIn: boolean;
  user: any;
  onComplete?: (result: TaxResult) => void;
}

export const TaxFormProvider: React.FC<TaxFormProviderProps> = ({ 
  children, 
  isLoggedIn, 
  user,
  onComplete 
}) => {
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
      telefone: '',
      user
    }
  });
  
  const { 
    activeStep,
    taxResult,
    handleStepAdvance,
    handlePrevious,
    calculateAndSaveResult,
    restartForm
  } = useTaxCalculator(onComplete);

  const handleSubmit = async (data: TaxFormValues) => {
    if (activeStep < 2) {
      handleStepAdvance();
      return;
    }
    
    return calculateAndSaveResult(data);
  };

  const value = {
    activeStep,
    taxResult,
    handleStepAdvance,
    handlePrevious,
    calculateAndSaveResult,
    restartForm,
    methods,
    handleSubmit
  };

  return (
    <TaxFormContext.Provider value={value}>
      <FormProvider {...methods}>
        {children}
      </FormProvider>
    </TaxFormContext.Provider>
  );
};

// Create a hook to use the context
export const useTaxForm = () => {
  const context = useContext(TaxFormContext);
  if (context === undefined) {
    throw new Error('useTaxForm must be used within a TaxFormProvider');
  }
  return context;
};
