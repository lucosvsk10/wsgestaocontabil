
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFormContext, Control } from 'react-hook-form';
import { TaxFormValues } from '@/utils/tax/types';

interface CurrencyInputProps {
  name: keyof TaxFormValues;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  control?: Control<TaxFormValues>;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  name,
  label,
  placeholder = "R$ 0,00",
  description,
  required = false,
  control
}) => {
  const formContext = useFormContext();
  const actualControl = control || formContext?.control;

  // Format currency input
  const formatCurrency = (value: string) => {
    if (!value) return '';
    
    // Remove non-numeric characters
    const numericValue = value.replace(/\D/g, '');
    
    // Convert to number and format
    const numberValue = parseInt(numericValue, 10) / 100;
    if (isNaN(numberValue)) return '';
    
    return numberValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };
  
  // Parse formatted currency to number
  const parseCurrency = (value: string) => {
    if (!value) return 0;
    
    const numericValue = value.replace(/\D/g, '');
    return parseInt(numericValue, 10) / 100;
  };

  if (!actualControl) {
    console.error('Form control is required for CurrencyInput');
    return null;
  }

  return (
    <FormField
      control={actualControl}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className={required ? "after:content-['*'] after:ml-1 after:text-red-500" : ""}>
            {label}
          </FormLabel>
          <FormControl>
            <Input 
              placeholder={placeholder} 
              {...field}
              value={field.value ? formatCurrency(field.value.toString()) : ''}
              onChange={(e) => {
                const formattedValue = formatCurrency(e.target.value);
                e.target.value = formattedValue;
                field.onChange(parseCurrency(formattedValue));
              }}
              className="rounded-xl border-gray-300 dark:border-navy-lighter focus:border-gold/70 focus:ring-gold/10" 
            />
          </FormControl>
          {description && (
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              {description}
            </p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
