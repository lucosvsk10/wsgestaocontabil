
import React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { currencyFormat } from '@/utils/taxCalculations';

interface IncomeStepProps {
  isLoggedIn: boolean;
}

export const IncomeStep: React.FC<IncomeStepProps> = ({ isLoggedIn }) => {
  const { control, register, watch, setValue } = useFormContext();
  
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
  
  // Handle currency input change
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const formattedValue = formatCurrency(e.target.value);
    e.target.value = formattedValue;
    setValue(fieldName, parseCurrency(formattedValue));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold dark:text-gold">Informações Pessoais e Rendimentos</h2>
      
      {/* Personal information fields - required only if not logged in */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={isLoggedIn ? "" : "required"}>Nome</FormLabel>
              <FormControl>
                <Input 
                  placeholder={isLoggedIn ? "Nome (opcional)" : "Nome (obrigatório)"} 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="seuemail@exemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name="telefone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="(00) 00000-0000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <hr className="border-gray-200 dark:border-navy-lighter" />
      
      <h3 className="text-lg font-medium dark:text-gold">Rendimentos</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="rendimentosTributaveis"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="required">Rendimentos Tributáveis</FormLabel>
              <FormControl>
                <Input 
                  placeholder="R$ 0,00" 
                  {...field}
                  value={field.value ? formatCurrency(field.value.toString()) : ''}
                  onChange={(e) => handleCurrencyChange(e, 'rendimentosTributaveis')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name="rendimentosIsentos"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rendimentos Isentos</FormLabel>
              <FormControl>
                <Input 
                  placeholder="R$ 0,00" 
                  {...field}
                  value={field.value ? formatCurrency(field.value.toString()) : ''}
                  onChange={(e) => handleCurrencyChange(e, 'rendimentosIsentos')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name="impostoRetidoFonte"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Imposto Retido na Fonte</FormLabel>
              <FormControl>
                <Input 
                  placeholder="R$ 0,00" 
                  {...field}
                  value={field.value ? formatCurrency(field.value.toString()) : ''}
                  onChange={(e) => handleCurrencyChange(e, 'impostoRetidoFonte')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <FormField
        control={control}
        name="ehAposentado65"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 bg-gray-50 dark:bg-navy-dark">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Aposentado(a) com 65 anos ou mais</FormLabel>
            </div>
          </FormItem>
        )}
      />
      
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
                className="flex flex-col space-y-1"
              >
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="completa" />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Completa (todas as deduções)
                  </FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="simplificada" />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Simplificada (desconto padrão)
                  </FormLabel>
                </FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <div className="flex justify-end">
        <button
          type="submit"
          className="px-4 py-2 bg-gold hover:bg-gold/90 text-navy rounded"
        >
          Próximo
        </button>
      </div>
    </div>
  );
};
