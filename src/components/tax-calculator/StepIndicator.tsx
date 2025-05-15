
import React from 'react';
import { Progress } from "@/components/ui/progress";
import { useTaxForm } from '@/contexts/TaxFormContext';

export interface StepIndicatorProps {
  step?: number;
  activeStep?: number;
}

export const StepIndicator = ({
  step,
  activeStep: propActiveStep
}: StepIndicatorProps) => {
  // Use context's activeStep if not provided via props
  const formContext = React.useContext(React.createContext<any>(null));
  const { activeStep: contextActiveStep } = useTaxForm?.() || { activeStep: 0 };
  
  // Priority: props -> context -> defaultValue
  const currentStep = propActiveStep !== undefined 
    ? propActiveStep 
    : contextActiveStep !== undefined 
      ? contextActiveStep 
      : step !== undefined 
        ? step 
        : 0;
  
  // Calculate progress percentage based on current step (assuming 3 steps total)
  const progress = (currentStep / 3) * 100;
  
  return (
    <div className="space-y-4 mb-8">
      <div className="flex justify-between">
        <div className={`text-center ${currentStep >= 0 ? 'text-navy-dark dark:text-gold font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
          Informações
        </div>
        <div className={`text-center ${currentStep >= 1 ? 'text-navy-dark dark:text-gold font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
          Deduções
        </div>
        <div className={`text-center ${currentStep >= 2 ? 'text-navy-dark dark:text-gold font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
          Resultado
        </div>
      </div>
      
      <Progress value={progress} className="h-2 bg-gray-200 dark:bg-navy-lighter">
        <div 
          className="h-full bg-gold transition-all" 
          style={{ width: `${progress}%` }}
        />
      </Progress>
    </div>
  );
};
