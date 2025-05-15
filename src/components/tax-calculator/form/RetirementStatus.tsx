
import React from 'react';
import { FormField, FormItem, FormControl, FormLabel } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useFormContext } from 'react-hook-form';

export const RetirementStatus: React.FC = () => {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name="ehAposentado65"
      render={({ field }) => (
        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 bg-gray-50 dark:bg-navy-dark">
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              className="data-[state=checked]:bg-gold data-[state=checked]:border-gold"
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel>Aposentado(a) com 65 anos ou mais</FormLabel>
          </div>
        </FormItem>
      )}
    />
  );
};
