
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useFormContext } from 'react-hook-form';

export const TaxDeclarationType: React.FC = () => {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name="tipoDeclaracao"
      render={({ field }) => (
        <FormItem className="space-y-3">
          <FormLabel>Tipo de Declaração</FormLabel>
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value}
              className="flex flex-col space-y-3"
            >
              <FormItem className="flex items-center space-x-3 space-y-0 rounded-md p-4 bg-gray-50 dark:bg-navy-dark border border-gray-200 dark:border-navy-lighter">
                <FormControl>
                  <RadioGroupItem 
                    value="completa" 
                    className="border-gray-400 text-gold data-[state=checked]:border-gold data-[state=checked]:bg-gold"
                  />
                </FormControl>
                <FormLabel className="font-medium cursor-pointer">
                  Completa (todas as deduções)
                </FormLabel>
              </FormItem>
              <FormItem className="flex items-center space-x-3 space-y-0 rounded-md p-4 bg-gray-50 dark:bg-navy-dark border border-gray-200 dark:border-navy-lighter">
                <FormControl>
                  <RadioGroupItem 
                    value="simplificada" 
                    className="border-gray-400 text-gold data-[state=checked]:border-gold data-[state=checked]:bg-gold"
                  />
                </FormControl>
                <FormLabel className="font-medium cursor-pointer">
                  Simplificada (desconto padrão)
                </FormLabel>
              </FormItem>
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
