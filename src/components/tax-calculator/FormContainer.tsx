
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TaxFormProvider } from '@/contexts/TaxFormContext';
import { TaxFormSteps } from './TaxFormSteps';
import { TaxResult } from '@/utils/tax/types';
import { StepIndicator } from './StepIndicator';

interface FormContainerProps {
  onComplete?: (result: TaxResult) => void;
}

export const FormContainer: React.FC<FormContainerProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  return (
    <div className="w-full">
      <TaxFormProvider 
        isLoggedIn={isLoggedIn} 
        user={user} 
        onComplete={onComplete}
      >
        <div className="p-6 bg-gray-50 dark:bg-navy-dark border-b border-gray-200 dark:border-navy-lighter/30">
          <StepIndicator />
        </div>
        
        <TaxFormSteps />
      </TaxFormProvider>
    </div>
  );
};

export default FormContainer;
