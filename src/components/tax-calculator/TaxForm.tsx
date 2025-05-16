
import React from "react";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TaxFormValues } from "@/types/tax-simulations";

interface TaxFormProps {
  onSubmit: (values: TaxFormValues) => void;
  defaultValues?: Partial<TaxFormValues>;
}

const TaxForm: React.FC<TaxFormProps> = ({ onSubmit, defaultValues = {} }) => {
  const form = useForm<TaxFormValues>({
    defaultValues: {
      rendimentoBruto: 0,
      inss: 0,
      educacao: 0,
      saude: 0,
      dependentes: 0,
      outrasDeducoes: 0,
      nome: "",
      email: "",
      telefone: "",
      ...defaultValues,
    },
  });

  const handleFormSubmit = form.handleSubmit((values) => {
    onSubmit(values);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rendimento Bruto */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label htmlFor="rendimentoBruto" className="text-sm font-medium">
                Rendimento Anual Bruto (R$)
              </label>
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle size={16} className="text-navy/60 dark:text-white/60" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Soma de todos os rendimentos tributáveis recebidos no ano (salários, aluguéis, etc).
                    </p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
            <Input
              id="rendimentoBruto"
              type="number"
              step="0.01"
              min="0"
              required
              {...form.register("rendimentoBruto", { 
                required: true,
                valueAsNumber: true,
              })}
            />
          </div>
          
          {/* Contribuição INSS */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label htmlFor="inss" className="text-sm font-medium">
                Contribuição ao INSS (R$)
              </label>
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle size={16} className="text-navy/60 dark:text-white/60" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Total de contribuições ao INSS no ano.
                    </p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
            <Input
              id="inss"
              type="number"
              step="0.01"
              min="0"
              required
              {...form.register("inss", { 
                required: true,
                valueAsNumber: true,
              })}
            />
          </div>
          
          {/* Despesas com Educação */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label htmlFor="educacao" className="text-sm font-medium">
                Despesas com Educação (R$)
              </label>
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle size={16} className="text-navy/60 dark:text-white/60" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Despesas com educação formal (limite de R$ 3.561,50 por pessoa).
                    </p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
            <Input
              id="educacao"
              type="number"
              step="0.01"
              min="0"
              {...form.register("educacao", { valueAsNumber: true })}
            />
          </div>
          
          {/* Despesas com Saúde */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label htmlFor="saude" className="text-sm font-medium">
                Despesas com Saúde (R$)
              </label>
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle size={16} className="text-navy/60 dark:text-white/60" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Despesas médicas, planos de saúde, exames, etc. Sem limite de dedução.
                    </p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
            <Input
              id="saude"
              type="number"
              step="0.01"
              min="0"
              {...form.register("saude", { valueAsNumber: true })}
            />
          </div>
          
          {/* Número de Dependentes */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label htmlFor="dependentes" className="text-sm font-medium">
                Número de Dependentes
              </label>
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle size={16} className="text-navy/60 dark:text-white/60" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Dedução de R$ 2.275,08 por dependente (filhos, cônjuge, etc).
                    </p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
            <Input
              id="dependentes"
              type="number"
              min="0"
              step="1"
              {...form.register("dependentes", { valueAsNumber: true })}
            />
          </div>
          
          {/* Outras Deduções */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label htmlFor="outrasDeducoes" className="text-sm font-medium">
                Outras Deduções (R$)
              </label>
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle size={16} className="text-navy/60 dark:text-white/60" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Pensão alimentícia, previdência privada (PGBL), doações, etc.
                    </p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
            <Input
              id="outrasDeducoes"
              type="number"
              step="0.01"
              min="0"
              {...form.register("outrasDeducoes", { valueAsNumber: true })}
            />
          </div>
        </div>
        
        <div className="flex justify-center">
          <Button type="submit" size="lg" className="min-w-[200px]">
            Simular agora
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default TaxForm;
