
import React from 'react';
import { useTaxForm } from '@/contexts/TaxFormContext';
import { IncomeStep } from './IncomeStep';
import { DeductionsStep } from './DeductionsStep';
import { ResultsStep } from './ResultsStep';
import { useAuth } from '@/contexts/AuthContext';

export const TaxFormSteps: React.FC = () => {
  const { activeStep, taxResult, handlePrevious, restartForm } = useTaxForm();
  const { methods, handleSubmit } = useTaxForm();
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <form onSubmit={methods.handleSubmit(handleSubmit)} className="p-6">
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
          formatCurrency={formatCurrency}
          onRestart={() => {
            methods.reset();
            restartForm();
          }} 
        />
      )}
    </form>
  );
};
