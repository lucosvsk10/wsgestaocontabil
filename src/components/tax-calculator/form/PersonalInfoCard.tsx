
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFormContext } from 'react-hook-form';

interface PersonalInfoCardProps {
  isLoggedIn: boolean;
}

export const PersonalInfoCard: React.FC<PersonalInfoCardProps> = ({ isLoggedIn }) => {
  const { control } = useFormContext();

  return (
    <Card className="border border-gray-200 dark:border-navy-lighter/30 shadow-md bg-white dark:bg-navy-deeper">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold dark:text-gold mb-4">Informações Pessoais</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={isLoggedIn ? "" : "after:content-['*'] after:ml-1 after:text-red-500"}>
                  Nome Completo
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder={isLoggedIn ? "Nome (opcional)" : "Nome (obrigatório)"} 
                    {...field}
                    className="rounded-xl border-gray-300 dark:border-navy-lighter focus:border-gold/70 focus:ring-gold/10" 
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
                  <Input 
                    placeholder="seuemail@exemplo.com" 
                    {...field}
                    className="rounded-xl border-gray-300 dark:border-navy-lighter focus:border-gold/70 focus:ring-gold/10" 
                  />
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
                  <Input 
                    placeholder="(00) 00000-0000" 
                    {...field}
                    className="rounded-xl border-gray-300 dark:border-navy-lighter focus:border-gold/70 focus:ring-gold/10" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};
