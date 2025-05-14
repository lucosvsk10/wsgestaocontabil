
import { Controller, Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { TaxFormValues } from "@/types/taxCalculator";

interface IncomeStepProps {
  control: Control<TaxFormValues>;
  errors: Record<string, any>;
}

export const IncomeStep = ({ control, errors }: IncomeStepProps) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Label htmlFor="rendimentosTributaveis">Rendimentos Tributáveis</Label>
          <Controller
            name="rendimentosTributaveis"
            control={control}
            render={({ field }) => (
              <Input
                id="rendimentosTributaveis"
                type="number"
                placeholder="0,00"
                {...field}
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className={errors.rendimentosTributaveis ? "border-red-500" : ""}
              />
            )}
          />
          {errors.rendimentosTributaveis && (
            <p className="text-red-500 text-sm">{errors.rendimentosTributaveis.message}</p>
          )}
          <p className="text-sm text-muted-foreground dark:text-gray-400">
            Salários, aposentadoria, aluguéis, etc.
          </p>
        </div>

        <div className="space-y-4">
          <Label htmlFor="rendimentosIsentos">Rendimentos Isentos</Label>
          <Controller
            name="rendimentosIsentos"
            control={control}
            render={({ field }) => (
              <Input
                id="rendimentosIsentos"
                type="number"
                placeholder="0,00"
                {...field}
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className={errors.rendimentosIsentos ? "border-red-500" : ""}
              />
            )}
          />
          {errors.rendimentosIsentos && (
            <p className="text-red-500 text-sm">{errors.rendimentosIsentos.message}</p>
          )}
          <p className="text-sm text-muted-foreground dark:text-gray-400">
            FGTS, seguro-desemprego, etc.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Label htmlFor="impostoRetidoFonte">Imposto Retido na Fonte</Label>
        <Controller
          name="impostoRetidoFonte"
          control={control}
          render={({ field }) => (
            <Input
              id="impostoRetidoFonte"
              type="number"
              placeholder="0,00"
              {...field}
              value={field.value}
              onChange={(e) => field.onChange(Number(e.target.value))}
              className={errors.impostoRetidoFonte ? "border-red-500" : ""}
            />
          )}
        />
        {errors.impostoRetidoFonte && (
          <p className="text-red-500 text-sm">{errors.impostoRetidoFonte.message}</p>
        )}
        <p className="text-sm text-muted-foreground dark:text-gray-400">
          Imposto já retido durante o ano (informe 0 se não houver)
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Controller
          name="ehAposentado65"
          control={control}
          render={({ field }) => (
            <Switch
              id="ehAposentado65"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor="ehAposentado65">Aposentado com 65 anos ou mais</Label>
      </div>

      <Alert className="bg-blue-50 dark:bg-navy-lighter border-blue-200 dark:border-navy-light">
        <InfoCircledIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-800 dark:text-blue-300">Dica</AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-200">
          Informe todos os rendimentos recebidos durante o ano fiscal. Rendimentos isentos não entram no cálculo do imposto, mas devem ser declarados.
        </AlertDescription>
      </Alert>
    </div>
  );
};
