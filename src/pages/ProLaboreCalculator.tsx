import { useState } from "react";
import { motion } from "framer-motion";
import SimpleNavbar from "@/components/calculators/SimpleNavbar";
import ResultActions from "@/components/calculators/ResultActions";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, DollarSign, Minus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ProLaboreCalculator = () => {
  const [valorBruto, setValorBruto] = useState("");
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calcularProLabore = () => {
    setLoading(true);
    
    const valor = parseFloat(valorBruto) || 0;
    
    // Valores 2024
    const salarioMinimo = 1412.00;
    const tetoINSS = 7786.02;
    
    // Calcular INSS (11% limitado ao teto)
    const baseINSS = Math.min(valor, tetoINSS);
    const inss = baseINSS * 0.11;
    
    // Calcular IRRF
    const baseIRRF = valor - inss;
    let irrf = 0;
    let aliquotaIRRF = 0;
    
    // Tabela IRRF mensal 2024
    if (baseIRRF <= 2112.00) {
      irrf = 0;
      aliquotaIRRF = 0;
    } else if (baseIRRF <= 2826.65) {
      irrf = (baseIRRF * 0.075) - 158.40;
      aliquotaIRRF = 7.5;
    } else if (baseIRRF <= 3751.05) {
      irrf = (baseIRRF * 0.15) - 370.40;
      aliquotaIRRF = 15;
    } else if (baseIRRF <= 4664.68) {
      irrf = (baseIRRF * 0.225) - 651.73;
      aliquotaIRRF = 22.5;
    } else {
      irrf = (baseIRRF * 0.275) - 884.96;
      aliquotaIRRF = 27.5;
    }
    
    irrf = Math.max(irrf, 0);
    
    const valorLiquido = valor - inss - irrf;
    const totalDescontos = inss + irrf;
    
    setResultado({
      valorBruto: valor,
      inss,
      irrf,
      aliquotaIRRF,
      totalDescontos,
      valorLiquido,
      tetoINSS,
      salarioMinimo
    });
    
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const resetForm = () => {
    setValorBruto("");
    setResultado(null);
  };

  return (
    <div className="min-h-screen bg-[#FFF1DE] dark:bg-[#020817] text-[#020817] dark:text-white font-extralight">
      <SimpleNavbar title="Simulação Pró-labore 2024" />
      
      <div className="container mx-auto px-4 py-[100px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-extralight text-[#efc349] mb-4">
              Simulação Pró-labore 2024
            </h1>
            <p className="text-xl text-gray-300 font-extralight">
              Calcule os descontos e valor líquido do seu pró-labore
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Formulário */}
            <Card className="bg-[#0b1320] border-[#efc349]/20">
              <CardHeader>
                <CardTitle className="text-[#efc349] font-extralight flex items-center">
                  <Calculator className="w-6 h-6 mr-2" />
                  Dados para Simulação
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="valorBruto" className="text-white font-extralight flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    Valor Bruto do Pró-labore (R$)
                  </Label>
                  <Input
                    id="valorBruto"
                    type="number"
                    placeholder="5000.00"
                    value={valorBruto}
                    onChange={(e) => setValorBruto(e.target.value)}
                    className="bg-[#020817] border-[#efc349]/30 text-white mt-1"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Valor mínimo: R$ 1.412,00 (salário mínimo)
                  </p>
                </div>

                <div className="bg-[#020817] rounded-lg p-4">
                  <h3 className="text-white font-medium mb-2">Informações Importantes:</h3>
                  <ul className="text-sm text-gray-300 space-y-1 font-extralight">
                    <li>• INSS: 11% limitado ao teto de R$ 7.786,02</li>
                    <li>• IRRF: Tabela progressiva mensal</li>
                    <li>• Valor mínimo: 1 salário mínimo</li>
                    <li>• Isento de FGTS</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={calcularProLabore}
                    disabled={loading || !valorBruto || parseFloat(valorBruto) < 1412}
                    className="flex-1 bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817] font-extralight"
                  >
                    {loading ? "Calculando..." : "Simular Pró-labore"}
                  </Button>
                  
                  <Button 
                    onClick={resetForm}
                    variant="outline"
                    className="border-[#efc349]/30 text-[#efc349] hover:bg-[#efc349]/10"
                  >
                    Limpar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Resultado */}
            {resultado && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="bg-[#0b1320] border-[#efc349]/20">
                  <CardHeader>
                    <CardTitle className="text-[#efc349] font-extralight">
                      Resultado da Simulação
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Resumo Principal */}
                    <div className="bg-[#020817] rounded-lg p-4">
                      <h3 className="text-lg font-medium text-white mb-3">Resumo</h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 flex items-center">
                            <Plus className="w-4 h-4 mr-1 text-green-400" />
                            Valor Bruto:
                          </span>
                          <span className="text-white font-medium text-lg">
                            {formatCurrency(resultado.valorBruto)}
                          </span>
                        </div>

                        <div className="border-t border-[#efc349]/20 pt-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400 flex items-center">
                              <Minus className="w-4 h-4 mr-1 text-red-400" />
                              INSS (11%):
                            </span>
                            <span className="text-red-400">
                              -{formatCurrency(resultado.inss)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between mt-2">
                            <span className="text-gray-400 flex items-center">
                              <Minus className="w-4 h-4 mr-1 text-red-400" />
                              IRRF ({resultado.aliquotaIRRF}%):
                            </span>
                            <span className="text-red-400">
                              -{formatCurrency(resultado.irrf)}
                            </span>
                          </div>
                        </div>

                        <div className="border-t-2 border-[#efc349] pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 font-medium">Valor Líquido:</span>
                            <span className="text-2xl font-bold text-[#efc349]">
                              {formatCurrency(resultado.valorLiquido)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detalhamento dos Descontos */}
                    <div className="bg-[#020817] rounded-lg p-4">
                      <h3 className="text-lg font-medium text-white mb-3">Detalhamento</h3>
                      
                      <div className="space-y-3 text-sm">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-400">INSS:</span>
                            <Badge className="bg-blue-600 hover:bg-blue-700">11%</Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            Base: {formatCurrency(Math.min(resultado.valorBruto, resultado.tetoINSS))}
                          </p>
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-400">IRRF:</span>
                            <Badge className="bg-purple-600 hover:bg-purple-700">
                              {resultado.aliquotaIRRF}%
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            Base: {formatCurrency(resultado.valorBruto - resultado.inss)}
                          </p>
                        </div>

                        <div className="border-t border-[#efc349]/20 pt-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total de Descontos:</span>
                            <span className="text-white font-medium">
                              {formatCurrency(resultado.totalDescontos)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Comparativo Anual */}
                    <div className="bg-[#020817] rounded-lg p-4">
                      <h3 className="text-lg font-medium text-white mb-3">Projeção Anual</h3>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Pró-labore Bruto (12 meses):</span>
                          <span className="text-white">
                            {formatCurrency(resultado.valorBruto * 12)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total INSS (12 meses):</span>
                          <span className="text-red-400">
                            -{formatCurrency(resultado.inss * 12)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total IRRF (12 meses):</span>
                          <span className="text-red-400">
                            -{formatCurrency(resultado.irrf * 12)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-[#efc349]/20 pt-2">
                          <span className="text-gray-400 font-medium">Líquido Anual:</span>
                          <span className="text-[#efc349] font-bold">
                            {formatCurrency(resultado.valorLiquido * 12)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Observações */}
                    <div className="bg-[#020817] rounded-lg p-4">
                      <h3 className="text-lg font-medium text-white mb-3">Observações</h3>
                      <ul className="text-xs text-gray-400 space-y-1 font-extralight">
                        <li>• Pró-labore não tem incidência de FGTS</li>
                        <li>• Valor mínimo obrigatório: 1 salário mínimo</li>
                        <li>• INSS limitado ao teto: R$ {formatCurrency(resultado.tetoINSS)}</li>
                        <li>• Cálculo baseado na tabela 2024</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
      
      <Footer />
    </div>
  );
};

export default ProLaboreCalculator;
