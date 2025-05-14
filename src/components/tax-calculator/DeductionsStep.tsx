
import { Controller, Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { TaxFormValues } from "@/types/taxCalculator";

interface DeductionsStepProps {
  control: Control<TaxFormValues>;
  errors: Record<string, any>;
  taxResult: any;
  formData: TaxFormValues;
}

export const DeductionsStep = ({ control, errors, taxResult, formData }: DeductionsStepProps) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Label htmlFor="contribuicaoPrevidenciaria">Contribuição Previdenciária</Label>
          <Controller
            name="contribuicaoPrevidenciaria"
            control={control}
            render={({ field }) => (
              <Input
                id="contribuicaoPrevidenciaria"
                type="number"
                placeholder="0,00"
                {...field}
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className={errors.contribuicaoPrevidenciaria ? "border-red-500" : ""}
              />
            )}
          />
          {errors.contribuicaoPrevidenciaria && (
            <p className="text-red-500 text-sm">{errors.contribuicaoPrevidenciaria.message}</p>
          )}
          <p className="text-sm text-muted-foreground dark:text-gray-400">
            INSS, previdência privada, etc.
          </p>
        </div>

        <div className="space-y-4">
          <Label htmlFor="despesasMedicas">Despesas Médicas</Label>
          <Controller
            name="despesasMedicas"
            control={control}
            render={({ field }) => (
              <Input
                id="despesasMedicas"
                type="number"
                placeholder="0,00"
                {...field}
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className={errors.despesasMedicas ? "border-red-500" : ""}
              />
            )}
          />
          {errors.despesasMedicas && (
            <p className="text-red-500 text-sm">{errors.despesasMedicas.message}</p>
          )}
          <p className="text-sm text-muted-foreground dark:text-gray-400">
            Consultas, exames, plano de saúde, etc.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Label htmlFor="despesasEducacao">Despesas com Educação</Label>
          <Controller
            name="despesasEducacao"
            control={control}
            render={({ field }) => (
              <Input
                id="despesasEducacao"
                type="number"
                placeholder="0,00"
                {...field}
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className={errors.despesasEducacao ? "border-red-500" : ""}
              />
            )}
          />
          {errors.despesasEducacao && (
            <p className="text-red-500 text-sm">{errors.despesasEducacao.message}</p>
          )}
          <p className="text-sm text-muted-foreground dark:text-gray-400">
            Mensalidades escolares, cursos, etc.
          </p>
        </div>

        <div className="space-y-4">
          <Label htmlFor="numeroDependentes">Número de Dependentes</Label>
          <Controller
            name="numeroDependentes"
            control={control}
            render={({ field }) => (
              <Input
                id="numeroDependentes"
                type="number"
                placeholder="0"
                {...field}
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className={errors.numeroDependentes ? "border-red-500" : ""}
              />
            )}
          />
          {errors.numeroDependentes && (
            <p className="text-red-500 text-sm">{errors.numeroDependentes.message}</p>
          )}
          <p className="text-sm text-muted-foreground dark:text-gray-400">
            Filhos, cônjuge, pais, etc.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Label htmlFor="pensaoAlimenticia">Pensão Alimentícia</Label>
          <Controller
            name="pensaoAlimenticia"
            control={control}
            render={({ field }) => (
              <Input
                id="pensaoAlimenticia"
                type="number"
                placeholder="0,00"
                {...field}
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className={errors.pensaoAlimenticia ? "border-red-500" : ""}
              />
            )}
          />
          {errors.pensaoAlimenticia && (
            <p className="text-red-500 text-sm">{errors.pensaoAlimenticia.message}</p>
          )}
        </div>

        <div className="space-y-4">
          <Label htmlFor="livroCaixa">Livro Caixa (Autônomos)</Label>
          <Controller
            name="livroCaixa"
            control={control}
            render={({ field }) => (
              <Input
                id="livroCaixa"
                type="number"
                placeholder="0,00"
                {...field}
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className={errors.livroCaixa ? "border-red-500" : ""}
              />
            )}
          />
          {errors.livroCaixa && (
            <p className="text-red-500 text-sm">{errors.livroCaixa.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Label>Modelo de Declaração</Label>
        <Controller
          name="tipoDeclaracao"
          control={control}
          render={({ field }) => (
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="completa" id="completa" />
                <Label htmlFor="completa" className="font-normal">
                  Completa (com todas as deduções)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="simplificada" id="simplificada" />
                <Label htmlFor="simplificada" className="font-normal">
                  Simplificada (desconto padrão de 20%, limitado a R$ 16.754,34)
                </Label>
              </div>
            </RadioGroup>
          )}
        />
      </div>

      {taxResult && (
        <Alert className={`${taxResult.declaracaoRecomendada === formData.tipoDeclaracao ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30'}`}>
          <InfoCircledIcon className={`h-4 w-4 ${taxResult.declaracaoRecomendada === formData.tipoDeclaracao ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`} />
          <AlertTitle className={`${taxResult.declaracaoRecomendada === formData.tipoDeclaracao ? 'text-green-800 dark:text-green-300' : 'text-amber-800 dark:text-amber-300'}`}>
            {taxResult.declaracaoRecomendada === formData.tipoDeclaracao ? 'Boa escolha!' : 'Recomendação'}
          </AlertTitle>
          <AlertDescription className={`${taxResult.declaracaoRecomendada === formData.tipoDeclaracao ? 'text-green-700 dark:text-green-200' : 'text-amber-700 dark:text-amber-200'}`}>
            {taxResult.declaracaoRecomendada === formData.tipoDeclaracao
              ? `O modelo ${formData.tipoDeclaracao} é o mais vantajoso para você.`
              : `Recomendamos o modelo ${taxResult.declaracaoRecomendada} que resultaria em um imposto menor.`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
