
import React from 'react';
import FormContainer from './FormContainer';
import { TaxCalculatorProps } from '@/types/taxCalculator';

const TaxCalculatorForm: React.FC<TaxCalculatorProps> = ({ onComplete }) => {
  return <FormContainer onComplete={onComplete} />;
};

export default TaxCalculatorForm;
