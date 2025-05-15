
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoCircledIcon, ExclamationTriangleIcon, ArrowRightIcon } from "@radix-ui/react-icons";
import { TaxFormValues, TaxResult } from "@/utils/tax/types";

interface ResultsStepProps {
  taxResult: TaxResult;
  formData: TaxFormValues;
  user: any;
  formatCurrency: (value: number) => string;
  onRestart: () => void;
}

export const ResultsStep = ({ taxResult, formData, user, formatCurrency, onRestart }: ResultsStepProps) => {
  const navigate = useNavigate();

  if (!taxResult) return null;

  const tipoDeclaracao = formData.tipoDeclaracao;
  const impostoDevido = taxResult.impostoDevido[tipoDeclaracao === 'completa' ? 'completo' : 'simplificado'];
  const saldoImposto = impostoDevido - formData.impostoRetidoFonte;
  const tipoSaldo = saldoImposto > 0 ? 'pagar' : saldoImposto < 0 ? 'restituir' : 'zero';

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2 dark:text-white">Resultado da Simulação</h3>
        <p className="text-muted-foreground dark:text-gray-300">
          Confira abaixo o resultado da sua simulação de Imposto de Renda
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-lg dark:bg-navy-deeper">
          <CardHeader className="pb-2">
            <CardTitle className="text-navy dark:text-gold">Resumo</CardTitle>
            <CardDescription className="dark:text-gray-300">
              Modelo de declaração: {tipoDeclaracao === 'completa' ? 'Completa' : 'Simplificada'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground dark:text-gray-300">Rendimentos tributáveis:</span>
              <span className="font-medium dark:text-white">{formatCurrency(formData.rendimentosTributaveis)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground dark:text-gray-300">Base de cálculo:</span>
              <span className="font-medium dark:text-white">
                {formatCurrency(taxResult.baseDeCalculo[tipoDeclaracao === 'completa' ? 'completa' : 'simplificada'])}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground dark:text-gray-300">Imposto devido:</span>
              <span className="font-medium dark:text-white">{formatCurrency(impostoDevido)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground dark:text-gray-300">Imposto retido na fonte:</span>
              <span className="font-medium dark:text-white">{formatCurrency(formData.impostoRetidoFonte)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between items-center">
              <span className="font-medium dark:text-white">Saldo:</span>
              <div className="flex items-center">
                <span className={`font-bold text-lg ${
                  tipoSaldo === 'pagar' ? 'text-red-500 dark:text-red-400' : 
                  tipoSaldo === 'restituir' ? 'text-green-500 dark:text-green-400' : 
                  'dark:text-white'
                }`}>
                  {tipoSaldo === 'pagar' ? formatCurrency(saldoImposto) : 
                   tipoSaldo === 'restituir' ? formatCurrency(Math.abs(saldoImposto)) : 
                   formatCurrency(0)}
                </span>
                <Badge className={`ml-2 ${
                  tipoSaldo === 'pagar' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border-red-300' : 
                  tipoSaldo === 'restituir' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 border-green-300' : 
                  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                }`}>
                  {tipoSaldo === 'pagar' ? 'A pagar' : 
                   tipoSaldo === 'restituir' ? 'A restituir' : 
                   'Zero'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-lg dark:bg-navy-deeper">
          <CardHeader className="pb-2">
            <CardTitle className="text-navy dark:text-gold">Deduções</CardTitle>
            <CardDescription className="dark:text-gray-300">
              {tipoDeclaracao === 'completa' ? 'Detalhamento das deduções' : 'Desconto simplificado'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tipoDeclaracao === 'completa' ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-gray-300">Contribuição previdenciária:</span>
                  <span className="font-medium dark:text-white">{formatCurrency(formData.contribuicaoPrevidenciaria)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-gray-300">Despesas médicas:</span>
                  <span className="font-medium dark:text-white">{formatCurrency(formData.despesasMedicas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-gray-300">Despesas com educação:</span>
                  <span className="font-medium dark:text-white">{formatCurrency(formData.despesasEducacao)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-gray-300">Dependentes ({formData.numeroDependentes}):</span>
                  <span className="font-medium dark:text-white">{formatCurrency(taxResult.detalhamentoDeducoes.dependentes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-gray-300">Pensão alimentícia:</span>
                  <span className="font-medium dark:text-white">{formatCurrency(formData.pensaoAlimenticia)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-gray-300">Livro caixa:</span>
                  <span className="font-medium dark:text-white">{formatCurrency(formData.livroCaixa)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span className="text-muted-foreground dark:text-gray-300">Desconto simplificado (20%):</span>
                <span className="font-medium dark:text-white">{formatCurrency(taxResult.descontoSimplificado)}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between">
              <span className="font-medium dark:text-white">Total de deduções:</span>
              <span className="font-bold dark:text-white">
                {formatCurrency(tipoDeclaracao === 'completa' ? taxResult.descontoCompleto : taxResult.descontoSimplificado)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-lg dark:bg-navy-deeper">
        <CardHeader className="pb-2">
          <CardTitle className="text-navy dark:text-gold">Detalhamento por Faixas</CardTitle>
          <CardDescription className="dark:text-gray-300">
            Cálculo progressivo do imposto por faixas de renda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-navy-lighter/30">
                  <th className="text-left py-2 px-4 dark:text-gray-300">Faixa</th>
                  <th className="text-left py-2 px-4 dark:text-gray-300">Base de Cálculo</th>
                  <th className="text-left py-2 px-4 dark:text-gray-300">Alíquota</th>
                  <th className="text-left py-2 px-4 dark:text-gray-300">Valor do Imposto</th>
                </tr>
              </thead>
              <tbody>
                {taxResult.impostoFaixas.map((faixa: any, index: number) => (
                  <tr key={index} className="border-b dark:border-navy-lighter/30">
                    <td className="py-2 px-4 dark:text-white">{faixa.faixa}ª Faixa</td>
                    <td className="py-2 px-4 dark:text-white">{formatCurrency(faixa.baseCalculo)}</td>
                    <td className="py-2 px-4 dark:text-white">{(faixa.aliquota * 100).toFixed(1)}%</td>
                    <td className="py-2 px-4 dark:text-white">{formatCurrency(faixa.valorImposto)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 dark:bg-navy">
                  <td className="py-2 px-4 font-medium dark:text-white">Total</td>
                  <td className="py-2 px-4 dark:text-white">{formatCurrency(taxResult.baseDeCalculo[tipoDeclaracao === 'completa' ? 'completa' : 'simplificada'])}</td>
                  <td className="py-2 px-4 dark:text-white">-</td>
                  <td className="py-2 px-4 font-medium dark:text-white">{formatCurrency(impostoDevido)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col space-y-4">
        <Alert className="rounded-xl border bg-blue-50 dark:bg-navy-lighter border-blue-200 dark:border-navy-light">
          <InfoCircledIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-800 dark:text-blue-300">Importante</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-200">
            Esta é apenas uma simulação. Para uma declaração oficial, consulte um contador ou utilize o programa oficial da Receita Federal.
          </AlertDescription>
        </Alert>

        {!user && (
          <Alert className="rounded-xl border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30">
            <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-800 dark:text-amber-300">Crie uma conta</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-200">
              Para salvar suas simulações e receber orientações personalizadas, 
              <Button variant="link" className="p-0 h-auto text-amber-700 dark:text-amber-200 underline" onClick={() => navigate('/register')}>
                crie uma conta
              </Button> ou 
              <Button variant="link" className="p-0 h-auto text-amber-700 dark:text-amber-200 underline" onClick={() => navigate('/login')}>
                faça login
              </Button>.
            </AlertDescription>
          </Alert>
        )}
      </div>
      
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onRestart}
          className="rounded-2xl border-gray-300 dark:border-navy-lighter hover:bg-gray-100 dark:hover:bg-navy-lighter"
        >
          Iniciar nova simulação
        </Button>
        
        <Button 
          onClick={() => navigate('/')}
          className="rounded-2xl bg-gold hover:bg-gold/90 text-navy"
        >
          Voltar para a página inicial
          <ArrowRightIcon className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
