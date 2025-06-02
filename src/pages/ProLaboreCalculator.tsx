
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Copy, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from "@/lib/supabaseClient";

const ProLaboreCalculator = () => {
  const [valorPretendido, setValorPretendido] = useState('');
  const [regimeTributario, setRegimeTributario] = useState('');
  const [aliquotaINSS, setAliquotaINSS] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const { toast } = useToast();

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
    salvarSimulacao(resultadoCalculo);
  };

  const salvarSimulacao = async (dados: any) => {
    try {
      await supabase.from('tax_simulations').insert({
        tipo_simulacao: 'Pró-labore',
        rendimento_bruto: dados.valorBruto,
        inss: dados.inssRetido,
        imposto_estimado: dados.valorBruto - dados.valorLiquido,
        educacao: 0,
        saude: 0,
        dependentes: 0,
        outras_deducoes: dados.impostosAdicionais
      });
    } catch (error) {
      console.error('Erro ao salvar simulação:', error);
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
    <div className="min-h-screen bg-[#FFF1DE] dark:bg-[#020817]">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl text-[#020817] dark:text-[#efc349] mb-4 font-extralight">
              Simulador de Pró-labore 2025
            </h1>
            <p className="text-[#020817]/80 dark:text-white/80 font-extralight">
              Calcule o valor líquido do seu pró-labore considerando todos os descontos
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Formulário */}
            <Card className="border-[#efc349]/30 bg-white dark:bg-transparent">
              <CardHeader>
                <CardTitle className="text-[#020817] dark:text-[#efc349] font-extralight flex items-center gap-2">
                  <Calculator size={24} />
                  Dados para Simulação
                </CardTitle>
                <CardDescription className="font-extralight">
                  Preencha os campos para calcular seu pró-labore líquido
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="valor" className="font-extralight">Valor Pretendido (R$)</Label>
                  <Input
                    id="valor"
                    type="number"
                    value={valorPretendido}
                    onChange={(e) => setValorPretendido(e.target.value)}
                    placeholder="Ex: 5000"
                    className="mt-1 bg-white dark:bg-transparent border-[#efc349]/30"
                  />
                  <p className="text-xs text-[#020817]/60 dark:text-white/60 mt-1 font-extralight">
                    Valor bruto desejado para o pró-labore
                  </p>
                </div>

                <div>
                  <Label htmlFor="regime" className="font-extralight">Regime Tributário</Label>
                  <Select value={regimeTributario} onValueChange={setRegimeTributario}>
                    <SelectTrigger className="bg-white dark:bg-transparent border-[#efc349]/30">
                      <SelectValue placeholder="Selecione o regime" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Simples Nacional">Simples Nacional</SelectItem>
                      <SelectItem value="Lucro Presumido">Lucro Presumido</SelectItem>
                      <SelectItem value="Lucro Real">Lucro Real</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#020817]/60 dark:text-white/60 mt-1 font-extralight">
                    Regime tributário da empresa
                  </p>
                </div>

                <div>
                  <Label htmlFor="inss" className="font-extralight">Alíquota INSS (%)</Label>
                  <Select value={aliquotaINSS} onValueChange={setAliquotaINSS}>
                    <SelectTrigger className="bg-white dark:bg-transparent border-[#efc349]/30">
                      <SelectValue placeholder="Selecione a alíquota" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="11">11% (Padrão)</SelectItem>
                      <SelectItem value="20">20% (Contribuição ampliada)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#020817]/60 dark:text-white/60 mt-1 font-extralight">
                    Alíquota de INSS do sócio
                  </p>
                </div>

                <Button 
                  onClick={calcularProLabore}
                  className="w-full bg-[#020817] dark:bg-transparent border border-[#efc349] text-white dark:text-[#efc349] hover:bg-[#020817]/90 dark:hover:bg-[#efc349]/10 font-extralight"
                >
                  Calcular Pró-labore
                </Button>
              </CardContent>
            </Card>

            {/* Resultado */}
            {resultado && (
              <Card className="border-[#efc349]/30 bg-white dark:bg-transparent">
                <CardHeader>
                  <CardTitle className="text-[#020817] dark:text-[#efc349] font-extralight">
                    Resultado da Simulação
                  </CardTitle>
                  <CardDescription className="font-extralight">
                    Breakdown completo do seu pró-labore
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-[#efc349]/10 rounded-lg p-4 border border-[#efc349]/30">
                    <h3 className="text-lg font-extralight text-[#020817] dark:text-[#efc349] mb-3">
                      Resumo Financeiro
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#020817]/70 dark:text-white/70 font-extralight">Valor Bruto:</span>
                        <span className="text-[#020817] dark:text-white font-extralight">
                          {resultado.valorBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#020817]/70 dark:text-white/70 font-extralight">Regime:</span>
                        <span className="text-[#020817] dark:text-white font-extralight">
                          {resultado.regimeTributario}
                        </span>
                      </div>
                      <div className="border-t border-[#efc349]/30 pt-2">
                        <h4 className="font-extralight text-[#020817] dark:text-[#efc349] mb-2">Descontos:</h4>
                        <div className="flex justify-between">
                          <span className="text-[#020817]/70 dark:text-white/70 font-extralight">INSS Retido:</span>
                          <span className="text-red-600 dark:text-red-400 font-extralight">
                            -{resultado.inssRetido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                        {resultado.irrfRetido > 0 && (
                          <div className="flex justify-between">
                            <span className="text-[#020817]/70 dark:text-white/70 font-extralight">IRRF Retido:</span>
                            <span className="text-red-600 dark:text-red-400 font-extralight">
                              -{resultado.irrfRetido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                        )}
                        {resultado.impostosAdicionais > 0 && (
                          <div className="flex justify-between">
                            <span className="text-[#020817]/70 dark:text-white/70 font-extralight">{resultado.descricaoImpostos}:</span>
                            <span className="text-red-600 dark:text-red-400 font-extralight">
                              -{resultado.impostosAdicionais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="border-t border-[#efc349]/30 pt-2">
                        <div className="flex justify-between text-lg">
                          <span className="text-[#020817] dark:text-[#efc349] font-extralight">Valor Líquido:</span>
                          <span className="text-green-600 dark:text-green-400 font-extralight">
                            {resultado.valorLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#020817]/70 dark:text-white/70 font-extralight">Desconto Total:</span>
                          <span className="text-[#020817] dark:text-white font-extralight">
                            {resultado.percentualDesconto}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={copiarResultado}
                      variant="outline" 
                      size="sm"
                      className="flex-1 border-[#efc349]/30 hover:bg-[#efc349]/10 font-extralight"
                    >
                      <Copy size={16} className="mr-1" />
                      Copiar
                    </Button>
                    <Button 
                      onClick={() => window.print()}
                      variant="outline" 
                      size="sm"
                      className="flex-1 border-[#efc349]/30 hover:bg-[#efc349]/10 font-extralight"
                    >
                      <Printer size={16} className="mr-1" />
                      Imprimir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ProLaboreCalculator;
