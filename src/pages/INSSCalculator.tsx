
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Copy, Printer, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from '@/contexts/AuthContext';

const INSSCalculator = () => {
  const [salarioBruto, setSalarioBruto] = useState('');
  const [tipoContribuinte, setTipoContribuinte] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const calcularINSS = () => {
    const salario = parseFloat(salarioBruto);
    
    if (!salario || salario <= 0) {
      toast({
        title: "Erro",
        description: "Por favor, informe um salário válido.",
        variant: "destructive"
      });
      return;
    }

    if (!tipoContribuinte) {
      toast({
        title: "Erro", 
        description: "Por favor, selecione o tipo de contribuinte.",
        variant: "destructive"
      });
      return;
    }

    let inssDevido = 0;
    let faixaAplicada = '';
    let aliquotaEfetiva = 0;
    let observacoes = '';

    // Faixas INSS 2025 para CLT
    const faixasCLT = [
      { min: 0, max: 1412.00, aliquota: 7.5 },
      { min: 1412.01, max: 2666.68, aliquota: 9.0 },
      { min: 2666.69, max: 4000.03, aliquota: 12.0 },
      { min: 4000.04, max: 7786.02, aliquota: 14.0 }
    ];

    if (tipoContribuinte === 'CLT') {
      // Cálculo progressivo para CLT
      for (const faixa of faixasCLT) {
        if (salario > faixa.min) {
          const baseCalculo = Math.min(salario, faixa.max) - (faixa.min - 0.01);
          inssDevido += baseCalculo * (faixa.aliquota / 100);
          
          if (salario <= faixa.max) {
            faixaAplicada = `${faixa.min.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} a ${faixa.max.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
            break;
          }
        }
      }

      if (salario > 7786.02) {
        faixaAplicada = 'Acima do teto';
        inssDevido = 908.85; // Valor máximo INSS 2025
      }
    } 
    else if (tipoContribuinte === 'Autônomo') {
      // Contribuinte Individual (20% sobre salário de contribuição)
      const salarioContribuicao = Math.min(salario, 7786.02);
      inssDevido = salarioContribuicao * 0.20;
      faixaAplicada = 'Contribuinte Individual - 20%';
      observacoes = 'Alíquota de 20% sobre o salário de contribuição escolhido.';
    }
    else if (tipoContribuinte === 'MEI') {
      // MEI tem contribuição fixa
      if (salario <= 81000) { // Limite anual MEI 2025
        inssDevido = 70.60; // Valor fixo mensal MEI 2025 (5% sobre salário mínimo)
        faixaAplicada = 'MEI - Contribuição fixa';
        observacoes = 'Valor fixo mensal para MEI: 5% do salário mínimo + R$1,00 de ICMS.';
      } else {
        toast({
          title: "Erro",
          description: "Faturamento acima do limite MEI. Considere outro regime.",
          variant: "destructive"
        });
        return;
      }
    }
    else if (tipoContribuinte === 'Facultativo') {
      // Facultativo: 20% ou 11% com restrições
      const salarioContribuicao = Math.min(salario, 7786.02);
      const contribuicaoNormal = salarioContribuicao * 0.20;
      const contribuicaoReduzida = 1412.00 * 0.11; // 11% sobre salário mínimo
      
      inssDevido = contribuicaoNormal;
      faixaAplicada = 'Facultativo - 20%';
      observacoes = `Opção 1: ${contribuicaoNormal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (20% - aposentadoria por tempo de contribuição). Opção 2: ${contribuicaoReduzida.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (11% - apenas aposentadoria por idade).`;
    }

    aliquotaEfetiva = (inssDevido / salario) * 100;

    const resultadoCalculo = {
      salarioBruto: salario,
      tipoContribuinte,
      faixaAplicada,
      valorContribuicao: inssDevido,
      baseCalculo: Math.min(salario, 7786.02),
      aliquotaEfetiva: aliquotaEfetiva.toFixed(2),
      observacoes
    };

    setResultado(resultadoCalculo);
  };

  const salvarSimulacao = async () => {
    if (!resultado) return;
    
    setIsSaving(true);
    try {
      await supabase.from('tax_simulations').insert({
        user_id: user?.id || null,
        tipo_simulacao: 'INSS',
        rendimento_bruto: resultado.salarioBruto,
        inss: resultado.valorContribuicao,
        imposto_estimado: resultado.valorContribuicao,
        educacao: 0,
        saude: 0,
        dependentes: 0,
        outras_deducoes: 0
      });

      toast({
        title: "Simulação salva!",
        description: "Sua simulação foi salva com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar simulação:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a simulação.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copiarResultado = () => {
    if (!resultado) return;

    const texto = `
Cálculo INSS 2025
================
Salário Bruto: ${resultado.salarioBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
Tipo: ${resultado.tipoContribuinte}
Faixa: ${resultado.faixaAplicada}
Base de Cálculo: ${resultado.baseCalculo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
Contribuição INSS: ${resultado.valorContribuicao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
Alíquota Efetiva: ${resultado.aliquotaEfetiva}%
${resultado.observacoes ? `\nObservações: ${resultado.observacoes}` : ''}
    `;

    navigator.clipboard.writeText(texto);
    toast({
      title: "Copiado!",
      description: "Resultado copiado para a área de transferência."
    });
  };

  const imprimir = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#020817] py-8 px-4">
      <Navbar />
      
      <div className="max-w-4xl mx-auto space-y-8 mt-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-[#efc349]/10">
              <Calculator className="h-8 w-8 text-[#efc349]" />
            </div>
            <h1 className="text-4xl font-extralight text-[#020817] dark:text-[#efc349]">
              Calculadora de INSS 2025
            </h1>
          </div>
          <p className="text-lg font-extralight text-gray-600 dark:text-white/70 max-w-2xl mx-auto">
            Calcule sua contribuição para o INSS de forma simples e precisa
          </p>
        </div>

        {/* Calculator Form */}
        <Card className="bg-white/50 dark:bg-transparent backdrop-blur-sm border-gray-100 dark:border-[#efc349]/20">
          <CardHeader>
            <CardTitle className="text-2xl font-extralight text-[#020817] dark:text-[#efc349] flex items-center gap-2">
              <Calculator className="h-6 w-6" />
              Dados para Cálculo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="salario" className="font-extralight">Salário Bruto (R$)</Label>
                <Input
                  id="salario"
                  type="number"
                  value={salarioBruto}
                  onChange={(e) => setSalarioBruto(e.target.value)}
                  placeholder="Ex: 3000"
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
                <p className="text-xs text-gray-600 dark:text-white/60 font-extralight">
                  Informe seu salário bruto mensal
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo" className="font-extralight">Tipo de Contribuinte</Label>
                <Select value={tipoContribuinte} onValueChange={setTipoContribuinte}>
                  <SelectTrigger className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLT">CLT (Empregado)</SelectItem>
                    <SelectItem value="Autônomo">Autônomo/Contribuinte Individual</SelectItem>
                    <SelectItem value="MEI">MEI (Microempreendedor Individual)</SelectItem>
                    <SelectItem value="Facultativo">Facultativo</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600 dark:text-white/60 font-extralight">
                  Escolha sua categoria de contribuinte
                </p>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button 
                onClick={calcularINSS}
                size="lg"
                className="min-w-[200px] font-extralight bg-[#020817] dark:bg-transparent dark:border dark:border-[#efc349] text-white dark:text-[#efc349] hover:bg-[#0f172a] dark:hover:bg-[#efc349]/10"
              >
                Calcular INSS
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {resultado && (
          <div className="space-y-6">
            {/* Main Result */}
            <Card className="bg-white/50 dark:bg-transparent backdrop-blur-sm border-gray-100 dark:border-[#efc349]/20">
              <CardHeader>
                <CardTitle className="text-2xl font-extralight text-[#020817] dark:text-[#efc349] text-center">
                  Resultado do Cálculo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-extralight text-gray-600 dark:text-white/70">
                        Salário Bruto
                      </p>
                      <p className="text-lg font-extralight text-[#020817] dark:text-white">
                        {resultado.salarioBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-extralight text-gray-600 dark:text-white/70">
                        Tipo
                      </p>
                      <p className="text-lg font-extralight text-[#020817] dark:text-white">
                        {resultado.tipoContribuinte}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-extralight text-gray-600 dark:text-white/70">
                        Faixa
                      </p>
                      <p className="text-sm font-extralight text-[#020817] dark:text-white">
                        {resultado.faixaAplicada}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-extralight text-gray-600 dark:text-white/70">
                        Alíquota Efetiva
                      </p>
                      <p className="text-lg font-extralight text-[#020817] dark:text-[#efc349]">
                        {resultado.aliquotaEfetiva}%
                      </p>
                    </div>
                  </div>

                  <div className="py-6">
                    <p className="text-sm font-extralight text-gray-600 dark:text-white/70 mb-2">
                      Contribuição INSS
                    </p>
                    <p className="text-4xl font-extralight text-[#020817] dark:text-[#efc349]">
                      {resultado.valorContribuicao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>

                  {resultado.observacoes && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <p className="text-sm font-extralight text-blue-800 dark:text-blue-200">
                        <strong>Observações:</strong> {resultado.observacoes}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="bg-white/50 dark:bg-transparent backdrop-blur-sm border-gray-100 dark:border-[#efc349]/20">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={copiarResultado}
                    variant="outline"
                    className="font-extralight border-[#efc349]/30 hover:bg-[#efc349]/10"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Resultado
                  </Button>
                  <Button
                    onClick={imprimir}
                    variant="outline"
                    className="font-extralight border-[#efc349]/30 hover:bg-[#efc349]/10"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </Button>
                  <Button
                    onClick={salvarSimulacao}
                    disabled={isSaving}
                    className="font-extralight bg-[#020817] dark:bg-transparent dark:border dark:border-[#efc349] text-white dark:text-[#efc349] hover:bg-[#0f172a] dark:hover:bg-[#efc349]/10"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Salvando..." : "Salvar Simulação"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default INSSCalculator;
