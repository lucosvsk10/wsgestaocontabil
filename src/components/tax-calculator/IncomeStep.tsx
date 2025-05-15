
import React from 'react';
import { PersonalInfoCard } from './form/PersonalInfoCard';
import { IncomeDetailsCard } from './form/IncomeDetailsCard';

interface IncomeStepProps {
  isLoggedIn: boolean;
}

export const IncomeStep: React.FC<IncomeStepProps> = ({ isLoggedIn }) => {
  return (
    <div className="space-y-8">
      <PersonalInfoCard isLoggedIn={isLoggedIn} />
      <IncomeDetailsCard />
      
      <div className="flex justify-end">
        <button
          type="submit"
          className="px-8 py-2 bg-gold hover:bg-gold/90 text-navy font-medium rounded-2xl hover:shadow-md transition-all"
        >
          Próximo
        </button>
      </div>
    </div>
  );
};
