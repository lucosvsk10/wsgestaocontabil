
import { Controller, Control } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { TaxFormValues, TaxResult } from "@/utils/tax/types";

interface DeductionsStepProps {
  control: Control<TaxFormValues>;
  errors: Record<string, any>;
  taxResult: TaxResult | null;
  formData: TaxFormValues;
}

export const DeductionsStep = ({ control, errors, taxResult, formData }: DeductionsStepProps) => {
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
  
  return (
    <div className="space-y-8">
      <Card className="border border-gray-200 dark:border-navy-lighter/30 shadow-md bg-white dark:bg-navy-deeper">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold dark:text-gold mb-4">Deduções Previdenciárias</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="contribuicaoPrevidenciaria" className="text-sm font-medium">
                Contribuição Previdenciária
              </Label>
              <Controller
                name="contribuicaoPrevidenciaria"
                control={control}
                render={({ field }) => (
                  <Input
                    id="contribuicaoPrevidenciaria"
                    placeholder="R$ 0,00"
                    {...field}
                    value={field.value ? formatCurrency(field.value.toString()) : ''}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/\D/g, '');
                      field.onChange(Number(numericValue) / 100);
                      e.target.value = formatCurrency(numericValue);
                    }}
                    className={`rounded-xl border-gray-300 dark:border-navy-lighter focus:border-gold/70 focus:ring-gold/10 ${errors.contribuicaoPrevidenciaria ? "border-red-500" : ""}`}
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
          </div>
        </CardContent>
      </Card>
      
      <Card className="border border-gray-200 dark:border-navy-lighter/30 shadow-md bg-white dark:bg-navy-deeper">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold dark:text-gold mb-4">Deduções de Despesas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="despesasMedicas" className="text-sm font-medium">Despesas Médicas</Label>
              <Controller
                name="despesasMedicas"
                control={control}
                render={({ field }) => (
                  <Input
                    id="despesasMedicas"
                    placeholder="R$ 0,00"
                    {...field}
                    value={field.value ? formatCurrency(field.value.toString()) : ''}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/\D/g, '');
                      field.onChange(Number(numericValue) / 100);
                      e.target.value = formatCurrency(numericValue);
                    }}
                    className={`rounded-xl border-gray-300 dark:border-navy-lighter focus:border-gold/70 focus:ring-gold/10 ${errors.despesasMedicas ? "border-red-500" : ""}`}
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

            <div className="space-y-2">
              <Label htmlFor="despesasEducacao" className="text-sm font-medium">Despesas com Educação</Label>
              <Controller
                name="despesasEducacao"
                control={control}
                render={({ field }) => (
                  <Input
                    id="despesasEducacao"
                    placeholder="R$ 0,00"
                    {...field}
                    value={field.value ? formatCurrency(field.value.toString()) : ''}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/\D/g, '');
                      field.onChange(Number(numericValue) / 100);
                      e.target.value = formatCurrency(numericValue);
                    }}
                    className={`rounded-xl border-gray-300 dark:border-navy-lighter focus:border-gold/70 focus:ring-gold/10 ${errors.despesasEducacao ? "border-red-500" : ""}`}
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

            <div className="space-y-2">
              <Label htmlFor="numeroDependentes" className="text-sm font-medium">Número de Dependentes</Label>
              <Controller
                name="numeroDependentes"
                control={control}
                render={({ field }) => (
                  <Input
                    id="numeroDependentes"
                    type="number"
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className={`rounded-xl border-gray-300 dark:border-navy-lighter focus:border-gold/70 focus:ring-gold/10 ${errors.numeroDependentes ? "border-red-500" : ""}`}
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
            
            <div className="space-y-2">
              <Label htmlFor="pensaoAlimenticia" className="text-sm font-medium">Pensão Alimentícia</Label>
              <Controller
                name="pensaoAlimenticia"
                control={control}
                render={({ field }) => (
                  <Input
                    id="pensaoAlimenticia"
                    placeholder="R$ 0,00"
                    {...field}
                    value={field.value ? formatCurrency(field.value.toString()) : ''}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/\D/g, '');
                      field.onChange(Number(numericValue) / 100);
                      e.target.value = formatCurrency(numericValue);
                    }}
                    className={`rounded-xl border-gray-300 dark:border-navy-lighter focus:border-gold/70 focus:ring-gold/10 ${errors.pensaoAlimenticia ? "border-red-500" : ""}`}
                  />
                )}
              />
              {errors.pensaoAlimenticia && (
                <p className="text-red-500 text-sm">{errors.pensaoAlimenticia.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="livroCaixa" className="text-sm font-medium">Livro Caixa (Autônomos)</Label>
              <Controller
                name="livroCaixa"
                control={control}
                render={({ field }) => (
                  <Input
                    id="livroCaixa"
                    placeholder="R$ 0,00"
                    {...field}
                    value={field.value ? formatCurrency(field.value.toString()) : ''}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/\D/g, '');
                      field.onChange(Number(numericValue) / 100);
                      e.target.value = formatCurrency(numericValue);
                    }}
                    className={`rounded-xl border-gray-300 dark:border-navy-lighter focus:border-gold/70 focus:ring-gold/10 ${errors.livroCaixa ? "border-red-500" : ""}`}
                  />
                )}
              />
              {errors.livroCaixa && (
                <p className="text-red-500 text-sm">{errors.livroCaixa.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {taxResult && (
        <Alert className={`rounded-xl border ${taxResult.declaracaoRecomendada === formData.tipoDeclaracao ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30'}`}>
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
      
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-2 bg-gray-200 text-gray-800 dark:bg-navy-lighter dark:text-white rounded-2xl hover:shadow-md transition-all"
        >
          Voltar
        </button>
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
