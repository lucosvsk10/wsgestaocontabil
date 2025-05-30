
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

const ProLaboreCalculator = () => {
  const [valorProLabore, setValorProLabore] = useState('');
  const [regimeTributario, setRegimeTributario] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const calcularProLabore = () => {
    const valor = parseFloat(valorProLabore);
    
    if (!valor || valor <= 0) {
      toast({
        title: "Erro",
        description: "Por favor, informe um valor válido.",
        variant: "destructive"
      });
      return;
    }

    if (!regimeTributario) {
      toast({
        title: "Erro", 
        description: "Por favor, selecione o regime tributário.",
        variant: "destructive"
      });
      return;
    }

    let inss = 0;
    let irrf = 0;
    let totalDescontos = 0;
    let valorLiquido = 0;
    let observacoes = '';

    // Cálculo INSS sobre pró-labore (sempre 11% para sócios)
    const tetoINSS = 7786.02;
    const baseINSS = Math.min(valor, tetoINSS);
    inss = baseINSS * 0.11;

    // Cálculo IRRF progressivo
    const baseIRRF = valor - inss;
    
    // Tabela IRRF 2025
    const faixasIRRF = [
      { min: 0, max: 2259.20, aliquota: 0, deducao: 0 },
      { min: 2259.21, max: 2826.65, aliquota: 7.5, deducao: 169.44 },
      { min: 2826.66, max: 3751.05, aliquota: 15, deducao: 381.44 },
      { min: 3751.06, max: 4664.68, aliquota: 22.5, deducao: 662.77 },
      { min: 4664.69, max: Infinity, aliquota: 27.5, deducao: 896.00 }
    ];

    // Encontrar faixa IRRF
    for (const faixa of faixasIRRF) {
      if (baseIRRF >= faixa.min && baseIRRF <= faixa.max) {
        irrf = Math.max(0, (baseIRRF * faixa.aliquota / 100) - faixa.deducao);
        break;
      }
    }

    totalDescontos = inss + irrf;
    valorLiquido = valor - totalDescontos;

    // Observações específicas por regime
    if (regimeTributario === 'Simples Nacional') {
      observacoes = 'No Simples Nacional, o pró-labore não está sujeito ao DAS, apenas INSS e IRRF.';
    } else if (regimeTributario === 'Lucro Presumido') {
      observacoes = 'No Lucro Presumido, além dos descontos no pró-labore, a empresa recolhe INSS patronal (20%).';
    } else if (regimeTributario === 'Lucro Real') {
      observacoes = 'No Lucro Real, além dos descontos no pró-labore, a empresa recolhe INSS patronal (20%).';
    }

    const resultadoCalculo = {
      valorBruto: valor,
      regimeTributario,
      descontos: {
        inss,
        irrf
      },
      totalDescontos,
      valorLiquido,
      percentualDesconto: (totalDescontos / valor * 100).toFixed(2),
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
        tipo_simulacao: 'Pró-labore',
        rendimento_bruto: resultado.valorBruto,
        inss: resultado.descontos.inss,
        imposto_estimado: resultado.descontos.irrf,
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
Cálculo Pró-labore 2025
======================
Valor Bruto: ${resultado.valorBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
Regime: ${resultado.regimeTributario}
INSS (11%): ${resultado.descontos.inss.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
IRRF: ${resultado.descontos.irrf.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
Total Descontos: ${resultado.totalDescontos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
Valor Líquido: ${resultado.valorLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
              Simulador de Pró-labore 2025
            </h1>
          </div>
          <p className="text-lg font-extralight text-gray-600 dark:text-white/70 max-w-2xl mx-auto">
            Calcule os descontos sobre pró-labore de sócios e administradores
          </p>
        </div>

        {/* Calculator Form */}
        <Card className="bg-white/50 dark:bg-transparent backdrop-blur-sm border-gray-100 dark:border-[#efc349]/20">
          <CardHeader>
            <CardTitle className="text-2xl font-extralight text-[#020817] dark:text-[#efc349] flex items-center gap-2">
              <Calculator className="h-6 w-6" />
              Dados para Simulação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="valor" className="font-extralight">Valor do Pró-labore (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  value={valorProLabore}
                  onChange={(e) => setValorProLabore(e.target.value)}
                  placeholder="Ex: 5000"
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
                <p className="text-xs text-gray-600 dark:text-white/60 font-extralight">
                  Informe o valor mensal do pró-labore
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="regime" className="font-extralight">Regime Tributário da Empresa</Label>
                <Select value={regimeTributario} onValueChange={setRegimeTributario}>
                  <SelectTrigger className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight">
                    <SelectValue placeholder="Selecione o regime" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Simples Nacional">Simples Nacional</SelectItem>
                    <SelectItem value="Lucro Presumido">Lucro Presumido</SelectItem>
                    <SelectItem value="Lucro Real">Lucro Real</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600 dark:text-white/60 font-extralight">
                  Escolha o regime tributário da empresa
                </p>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button 
                onClick={calcularProLabore}
                size="lg"
                className="min-w-[200px] font-extralight bg-[#020817] dark:bg-transparent dark:border dark:border-[#efc349] text-white dark:text-[#efc349] hover:bg-[#0f172a] dark:hover:bg-[#efc349]/10"
              >
                Calcular Pró-labore
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
                  Resultado da Simulação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-extralight text-gray-600 dark:text-white/70">
                        Valor Bruto
                      </p>
                      <p className="text-lg font-extralight text-[#020817] dark:text-white">
                        {resultado.valorBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-extralight text-gray-600 dark:text-white/70">
                        INSS (11%)
                      </p>
                      <p className="text-lg font-extralight text-[#020817] dark:text-white">
                        {resultado.descontos.inss.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-extralight text-gray-600 dark:text-white/70">
                        IRRF
                      </p>
                      <p className="text-lg font-extralight text-[#020817] dark:text-white">
                        {resultado.descontos.irrf.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-extralight text-gray-600 dark:text-white/70">
                        % Desconto
                      </p>
                      <p className="text-lg font-extralight text-[#020817] dark:text-[#efc349]">
                        {resultado.percentualDesconto}%
                      </p>
                    </div>
                  </div>

                  <div className="py-6">
                    <p className="text-sm font-extralight text-gray-600 dark:text-white/70 mb-2">
                      Valor Líquido
                    </p>
                    <p className="text-4xl font-extralight text-[#020817] dark:text-[#efc349]">
                      {resultado.valorLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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

export default ProLaboreCalculator;
