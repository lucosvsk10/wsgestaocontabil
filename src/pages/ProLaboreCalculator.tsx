
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
  const [valorPretendido, setValorPretendido] = useState('');
  const [regimeTributario, setRegimeTributario] = useState('');
  const [aliquotaINSS, setAliquotaINSS] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const calcularProLabore = () => {
    const valor = parseFloat(valorPretendido);
    
    if (!valor || valor <= 0) {
      toast({
        title: "Erro",
        description: "Por favor, informe um valor válido.",
        variant: "destructive"
      });
      return;
    }

    if (!regimeTributario || !aliquotaINSS) {
      toast({
        title: "Erro", 
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }

    // Cálculo INSS sobre pró-labore
    const aliquota = parseFloat(aliquotaINSS);
    const inssRetido = valor * (aliquota / 100);
    const tetoINSS = 908.85; // Teto INSS 2025
    const inssReal = Math.min(inssRetido, tetoINSS);

    // IRRF sobre pró-labore (se aplicável)
    let irrfRetido = 0;
    const baseIRRF = valor - inssReal;
    
    if (baseIRRF > 2259.20) { // Faixa isenta IRRF 2025
      if (baseIRRF <= 2826.65) {
        irrfRetido = (baseIRRF * 0.075) - 169.44;
      } else if (baseIRRF <= 3751.05) {
        irrfRetido = (baseIRRF * 0.15) - 381.44;
      } else if (baseIRRF <= 4664.68) {
        irrfRetido = (baseIRRF * 0.225) - 662.77;
      } else {
        irrfRetido = (baseIRRF * 0.275) - 896.00;
      }
      irrfRetido = Math.max(0, irrfRetido);
    }

    // Impostos adicionais conforme regime
    let impostosAdicionais = 0;
    let descricaoImpostos = '';

    switch (regimeTributario) {
      case 'Simples Nacional':
        descricaoImpostos = 'Não há impostos adicionais no Simples Nacional';
        break;
      case 'Lucro Presumido':
        impostosAdicionais = valor * 0.11; // PIS/COFINS
        descricaoImpostos = 'PIS/COFINS sobre pró-labore';
        break;
      case 'Lucro Real':
        impostosAdicionais = valor * 0.0975; // PIS/COFINS
        descricaoImpostos = 'PIS/COFINS sobre pró-labore';
        break;
    }

    const valorLiquido = valor - inssReal - irrfRetido - impostosAdicionais;

    const resultadoCalculo = {
      valorBruto: valor,
      regimeTributario,
      aliquotaINSS: aliquota,
      inssRetido: inssReal,
      irrfRetido,
      impostosAdicionais,
      descricaoImpostos,
      valorLiquido,
      percentualDesconto: ((valor - valorLiquido) / valor * 100).toFixed(2)
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
        inss: resultado.inssRetido,
        imposto_estimado: resultado.valorBruto - resultado.valorLiquido,
        educacao: 0,
        saude: 0,
        dependentes: 0,
        outras_deducoes: resultado.impostosAdicionais
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
Simulação Pró-labore 2025
========================
Valor Bruto: ${resultado.valorBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
Regime: ${resultado.regimeTributario}
INSS Retido: ${resultado.inssRetido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
IRRF Retido: ${resultado.irrfRetido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
Impostos Adicionais: ${resultado.impostosAdicionais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
Valor Líquido: ${resultado.valorLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
Desconto Total: ${resultado.percentualDesconto}%
    `;

    navigator.clipboard.writeText(texto);
    toast({
      title: "Copiado!",
      description: "Resultado copiado para a área de transferência."
    });
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
            Calcule o valor líquido do seu pró-labore considerando todos os descontos
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="valor" className="font-extralight">Valor Pretendido (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  value={valorPretendido}
                  onChange={(e) => setValorPretendido(e.target.value)}
                  placeholder="Ex: 5000"
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
                <p className="text-xs text-gray-600 dark:text-white/60 font-extralight">
                  Valor bruto desejado para o pró-labore
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="regime" className="font-extralight">Regime Tributário</Label>
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
                  Regime tributário da empresa
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inss" className="font-extralight">Alíquota INSS (%)</Label>
                <Select value={aliquotaINSS} onValueChange={setAliquotaINSS}>
                  <SelectTrigger className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight">
                    <SelectValue placeholder="Selecione a alíquota" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="11">11% (Padrão)</SelectItem>
                    <SelectItem value="20">20% (Contribuição ampliada)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600 dark:text-white/60 font-extralight">
                  Alíquota de INSS do sócio
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
                        Regime
                      </p>
                      <p className="text-lg font-extralight text-[#020817] dark:text-white">
                        {resultado.regimeTributario}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-extralight text-gray-600 dark:text-white/70">
                        INSS Retido
                      </p>
                      <p className="text-lg font-extralight text-red-600 dark:text-red-400">
                        -{resultado.inssRetido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-extralight text-gray-600 dark:text-white/70">
                        Desconto Total
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
                    <p className="text-4xl font-extralight text-green-600 dark:text-green-400">
                      {resultado.valorLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
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
                    onClick={() => window.print()}
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
