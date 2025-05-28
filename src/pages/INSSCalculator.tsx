
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Copy, FileText, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from "@/lib/supabaseClient";

const INSSCalculator = () => {
  const [salarioBruto, setSalarioBruto] = useState('');
  const [tipoContribuinte, setTipoContribuinte] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const { toast } = useToast();

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

    // Faixas INSS 2025
    const faixas = [
      { min: 0, max: 1412.00, aliquota: 7.5 },
      { min: 1412.01, max: 2666.68, aliquota: 9.0 },
      { min: 2666.69, max: 4000.03, aliquota: 12.0 },
      { min: 4000.04, max: 7786.02, aliquota: 14.0 }
    ];

    let inssDevido = 0;
    let faixaAplicada = '';
    let aliquotaEfetiva = 0;

    // Cálculo progressivo
    for (const faixa of faixas) {
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

    aliquotaEfetiva = (inssDevido / salario) * 100;

    const resultadoCalculo = {
      salarioBruto: salario,
      tipoContribuinte,
      faixaAplicada,
      valorContribuicao: inssDevido,
      baseCalculo: Math.min(salario, 7786.02),
      aliquotaEfetiva: aliquotaEfetiva.toFixed(2)
    };

    setResultado(resultadoCalculo);
    salvarSimulacao(resultadoCalculo);
  };

  const salvarSimulacao = async (dados: any) => {
    try {
      await supabase.from('tax_simulations').insert({
        tipo_simulacao: 'INSS',
        rendimento_bruto: dados.salarioBruto,
        inss: dados.valorContribuicao,
        imposto_estimado: dados.valorContribuicao,
        educacao: 0,
        saude: 0,
        dependentes: 0,
        outras_deducoes: 0
      });
    } catch (error) {
      console.error('Erro ao salvar simulação:', error);
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
    <div className="min-h-screen bg-[#FFF1DE] dark:bg-[#020817]">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl text-[#020817] dark:text-[#efc349] mb-4 font-extralight">
              Calculadora de INSS 2025
            </h1>
            <p className="text-[#020817]/80 dark:text-white/80 font-extralight">
              Calcule sua contribuição para o INSS de forma simples e precisa
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Formulário */}
            <Card className="border-[#efc349]/30 bg-white dark:bg-transparent">
              <CardHeader>
                <CardTitle className="text-[#020817] dark:text-[#efc349] font-extralight flex items-center gap-2">
                  <Calculator size={24} />
                  Dados para Cálculo
                </CardTitle>
                <CardDescription className="font-extralight">
                  Preencha os campos abaixo para calcular sua contribuição
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="salario" className="font-extralight">Salário Bruto (R$)</Label>
                  <Input
                    id="salario"
                    type="number"
                    value={salarioBruto}
                    onChange={(e) => setSalarioBruto(e.target.value)}
                    placeholder="Ex: 3000"
                    className="mt-1 bg-white dark:bg-transparent border-[#efc349]/30"
                  />
                  <p className="text-xs text-[#020817]/60 dark:text-white/60 mt-1 font-extralight">
                    Informe seu salário bruto mensal
                  </p>
                </div>

                <div>
                  <Label htmlFor="tipo" className="font-extralight">Tipo de Contribuinte</Label>
                  <Select value={tipoContribuinte} onValueChange={setTipoContribuinte}>
                    <SelectTrigger className="bg-white dark:bg-transparent border-[#efc349]/30">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLT">CLT</SelectItem>
                      <SelectItem value="Autônomo">Autônomo</SelectItem>
                      <SelectItem value="MEI">MEI</SelectItem>
                      <SelectItem value="Facultativo">Facultativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#020817]/60 dark:text-white/60 mt-1 font-extralight">
                    Escolha sua categoria de contribuinte
                  </p>
                </div>

                <Button 
                  onClick={calcularINSS}
                  className="w-full bg-[#020817] dark:bg-transparent border border-[#efc349] text-white dark:text-[#efc349] hover:bg-[#020817]/90 dark:hover:bg-[#efc349]/10 font-extralight"
                >
                  Calcular INSS
                </Button>
              </CardContent>
            </Card>

            {/* Resultado */}
            {resultado && (
              <Card className="border-[#efc349]/30 bg-white dark:bg-transparent">
                <CardHeader>
                  <CardTitle className="text-[#020817] dark:text-[#efc349] font-extralight">
                    Resultado do Cálculo
                  </CardTitle>
                  <CardDescription className="font-extralight">
                    Sua contribuição do INSS calculada
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-[#efc349]/10 rounded-lg p-4 border border-[#efc349]/30">
                    <h3 className="text-lg font-extralight text-[#020817] dark:text-[#efc349] mb-3">
                      Resumo da Contribuição
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#020817]/70 dark:text-white/70 font-extralight">Salário Bruto:</span>
                        <span className="text-[#020817] dark:text-white font-extralight">
                          {resultado.salarioBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#020817]/70 dark:text-white/70 font-extralight">Tipo:</span>
                        <span className="text-[#020817] dark:text-white font-extralight">
                          {resultado.tipoContribuinte}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#020817]/70 dark:text-white/70 font-extralight">Faixa:</span>
                        <span className="text-[#020817] dark:text-white font-extralight">
                          {resultado.faixaAplicada}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#020817]/70 dark:text-white/70 font-extralight">Base de Cálculo:</span>
                        <span className="text-[#020817] dark:text-white font-extralight">
                          {resultado.baseCalculo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      <div className="border-t border-[#efc349]/30 pt-2">
                        <div className="flex justify-between text-lg">
                          <span className="text-[#020817] dark:text-[#efc349] font-extralight">Contribuição INSS:</span>
                          <span className="text-[#020817] dark:text-[#efc349] font-extralight">
                            {resultado.valorContribuicao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#020817]/70 dark:text-white/70 font-extralight">Alíquota Efetiva:</span>
                          <span className="text-[#020817] dark:text-white font-extralight">
                            {resultado.aliquotaEfetiva}%
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
                      onClick={imprimir}
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

export default INSSCalculator;
