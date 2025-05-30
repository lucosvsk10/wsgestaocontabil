
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Copy, Printer, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from '@/contexts/AuthContext';

const TaxCalculator = () => {
  const [rendimentoBruto, setRendimentoBruto] = useState('');
  const [dependentes, setDependentes] = useState('');
  const [contribuicaoINSS, setContribuicaoINSS] = useState('');
  const [gastosEducacao, setGastosEducacao] = useState('');
  const [gastosSaude, setGastosSaude] = useState('');
  const [outrasDeducoes, setOutrasDeducoes] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const calcularIRPF = () => {
    const renda = parseFloat(rendimentoBruto) || 0;
    const numDependentes = parseInt(dependentes) || 0;
    const inss = parseFloat(contribuicaoINSS) || 0;
    const educacao = parseFloat(gastosEducacao) || 0;
    const saude = parseFloat(gastosSaude) || 0;
    const outras = parseFloat(outrasDeducoes) || 0;

    if (renda <= 0) {
      toast({
        title: "Erro",
        description: "Por favor, informe um rendimento válido.",
        variant: "destructive"
      });
      return;
    }

    // Tabela IRPF 2025 - Receita Federal
    const faixas = [
      { min: 0, max: 2259.20, aliquota: 0, deducao: 0 },
      { min: 2259.21, max: 2826.65, aliquota: 7.5, deducao: 169.44 },
      { min: 2826.66, max: 3751.05, aliquota: 15, deducao: 381.44 },
      { min: 3751.06, max: 4664.68, aliquota: 22.5, deducao: 662.77 },
      { min: 4664.69, max: Infinity, aliquota: 27.5, deducao: 896.00 }
    ];

    // Deduções permitidas
    const deducaoDependentes = numDependentes * 189.59; // 2025
    const limiteSaude = saude; // Sem limite para saúde
    const limiteEducacao = Math.min(educacao, 3561.50 * numDependentes); // Limite por dependente 2025
    
    const totalDeducoes = inss + deducaoDependentes + limiteSaude + limiteEducacao + outras;
    const baseCalculo = Math.max(0, renda - totalDeducoes);

    // Encontrar faixa aplicável
    let faixaAplicada = faixas[0];
    for (const faixa of faixas) {
      if (baseCalculo >= faixa.min && baseCalculo <= faixa.max) {
        faixaAplicada = faixa;
        break;
      }
    }

    const impostoDevido = Math.max(0, (baseCalculo * faixaAplicada.aliquota / 100) - faixaAplicada.deducao);
    const aliquotaEfetiva = renda > 0 ? (impostoDevido / renda) * 100 : 0;

    const resultadoCalculo = {
      rendimentoBruto: renda,
      totalDeducoes,
      baseCalculo,
      faixaAplicada: `${faixaAplicada.aliquota}%`,
      impostoDevido,
      aliquotaEfetiva: aliquotaEfetiva.toFixed(2),
      dependentes: numDependentes,
      deducoes: {
        inss,
        dependentes: deducaoDependentes,
        saude: limiteSaude,
        educacao: limiteEducacao,
        outras
      }
    };

    setResultado(resultadoCalculo);
  };

  const salvarSimulacao = async () => {
    if (!resultado) return;
    
    setIsSaving(true);
    try {
      await supabase.from('tax_simulations').insert({
        user_id: user?.id || null,
        tipo_simulacao: 'IRPF',
        rendimento_bruto: resultado.rendimentoBruto,
        inss: resultado.deducoes.inss,
        imposto_estimado: resultado.impostoDevido,
        educacao: resultado.deducoes.educacao,
        saude: resultado.deducoes.saude,
        dependentes: resultado.dependentes,
        outras_deducoes: resultado.deducoes.outras
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
Simulação IRPF 2025
==================
Rendimento Bruto: ${resultado.rendimentoBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
Base de Cálculo: ${resultado.baseCalculo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
Imposto Devido: ${resultado.impostoDevido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
              Simulador de IRPF 2025
            </h1>
          </div>
          <p className="text-lg font-extralight text-gray-600 dark:text-white/70 max-w-2xl mx-auto">
            Calcule seu Imposto de Renda de forma precisa e atualizada
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
                <Label htmlFor="renda" className="font-extralight">Rendimento Bruto Anual (R$)</Label>
                <Input
                  id="renda"
                  type="number"
                  value={rendimentoBruto}
                  onChange={(e) => setRendimentoBruto(e.target.value)}
                  placeholder="Ex: 50000"
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dependentes" className="font-extralight">Número de Dependentes</Label>
                <Input
                  id="dependentes"
                  type="number"
                  value={dependentes}
                  onChange={(e) => setDependentes(e.target.value)}
                  placeholder="Ex: 2"
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inss" className="font-extralight">Contribuição INSS (R$)</Label>
                <Input
                  id="inss"
                  type="number"
                  value={contribuicaoINSS}
                  onChange={(e) => setContribuicaoINSS(e.target.value)}
                  placeholder="Ex: 5000"
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="educacao" className="font-extralight">Gastos com Educação (R$)</Label>
                <Input
                  id="educacao"
                  type="number"
                  value={gastosEducacao}
                  onChange={(e) => setGastosEducacao(e.target.value)}
                  placeholder="Ex: 3000"
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="saude" className="font-extralight">Gastos com Saúde (R$)</Label>
                <Input
                  id="saude"
                  type="number"
                  value={gastosSaude}
                  onChange={(e) => setGastosSaude(e.target.value)}
                  placeholder="Ex: 2000"
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="outras" className="font-extralight">Outras Deduções (R$)</Label>
                <Input
                  id="outras"
                  type="number"
                  value={outrasDeducoes}
                  onChange={(e) => setOutrasDeducoes(e.target.value)}
                  placeholder="Ex: 1000"
                  className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30 font-extralight"
                />
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button 
                onClick={calcularIRPF}
                size="lg"
                className="min-w-[200px] font-extralight bg-[#020817] dark:bg-transparent dark:border dark:border-[#efc349] text-white dark:text-[#efc349] hover:bg-[#0f172a] dark:hover:bg-[#efc349]/10"
              >
                Calcular IRPF
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
                        Rendimento Bruto
                      </p>
                      <p className="text-lg font-extralight text-[#020817] dark:text-white">
                        {resultado.rendimentoBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-extralight text-gray-600 dark:text-white/70">
                        Base de Cálculo
                      </p>
                      <p className="text-lg font-extralight text-[#020817] dark:text-white">
                        {resultado.baseCalculo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-extralight text-gray-600 dark:text-white/70">
                        Faixa
                      </p>
                      <p className="text-lg font-extralight text-[#020817] dark:text-white">
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
                      Imposto Devido
                    </p>
                    <p className="text-4xl font-extralight text-[#020817] dark:text-[#efc349]">
                      {resultado.impostoDevido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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

export default TaxCalculator;
