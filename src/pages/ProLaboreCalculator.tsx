import { useState } from "react";
import { motion } from "framer-motion";
import SimpleNavbar from "@/components/calculators/SimpleNavbar";
import ResultActions from "@/components/calculators/ResultActions";
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
    <div className="min-h-screen bg-background text-foreground font-prompt print:bg-white">
      <div className="print:hidden">
        <SimpleNavbar title="Simulação Pró-labore 2024" />
      </div>
      
      <div className="container mx-auto px-4 py-[100px] print:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-extralight text-gold mb-4 print:text-foreground print:text-3xl">
              Simulação Pró-labore 2024
            </h1>
            <p className="text-xl text-muted-foreground font-extralight print:text-gray-600 print:text-base">
              Calcule os descontos e valor líquido do seu pró-labore
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Formulário */}
            <Card className="print:bg-white print:border-gray-300">
              <CardHeader>
                <CardTitle className="font-extralight flex items-center print:text-foreground">
                  <Calculator className="w-6 h-6 mr-2" />
                  Dados para Simulação
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="valorBruto" className="font-extralight flex items-center print:text-black">
                    <DollarSign className="w-4 h-4 mr-1" />
                    Valor Bruto do Pró-labore (R$)
                  </Label>
                  <Input
                    id="valorBruto"
                    type="number"
                    placeholder="5000.00"
                    value={valorBruto}
                    onChange={(e) => setValorBruto(e.target.value)}
                    className="mt-1 print:bg-white print:border-gray-300 print:text-black"
                  />
                  <p className="text-xs text-muted-foreground mt-1 print:text-gray-600">
                    Valor mínimo: R$ 1.412,00 (salário mínimo)
                  </p>
                </div>

                <div className="bg-muted rounded-lg p-4 print:bg-gray-50 print:border print:border-gray-300">
                  <h3 className="text-foreground font-medium mb-2 print:text-black">Informações Importantes:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 font-extralight print:text-gray-600">
                    <li>• INSS: 11% limitado ao teto de R$ 7.786,02</li>
                    <li>• IRRF: Tabela progressiva mensal</li>
                    <li>• Valor mínimo: 1 salário mínimo</li>
                    <li>• Isento de FGTS</li>
                  </ul>
                </div>

                <div className="flex gap-2 print:hidden">
                  <Button 
                    onClick={calcularProLabore}
                    disabled={loading || !valorBruto || parseFloat(valorBruto) < 1412}
                    className="flex-1 bg-gold hover:bg-gold-dark text-background font-extralight"
                  >
                    {loading ? "Calculando..." : "Simular Pró-labore"}
                  </Button>
                  
                  <Button 
                    onClick={resetForm}
                    variant="outline"
                    className="hover:bg-muted"
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
                <Card className="print:bg-white print:border-gray-300">
                  <CardHeader>
                    <CardTitle className="font-extralight print:text-foreground">
                      Resultado da Simulação
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Resumo Principal */}
                    <div className="bg-muted rounded-lg p-4 print:bg-gray-50 print:border print:border-gray-300">
                      <h3 className="text-lg font-medium text-foreground mb-3 print:text-black">Resumo</h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground flex items-center print:text-gray-600">
                            <Plus className="w-4 h-4 mr-1 text-green-500" />
                            Valor Bruto:
                          </span>
                          <span className="text-foreground font-medium text-lg print:text-black">
                            {formatCurrency(resultado.valorBruto)}
                          </span>
                        </div>

                        <div className="border-t border-border pt-3 print:border-gray-300">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground flex items-center print:text-gray-600">
                              <Minus className="w-4 h-4 mr-1 text-red-500" />
                              INSS (11%):
                            </span>
                            <span className="text-red-500 print:text-red-600">
                              -{formatCurrency(resultado.inss)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between mt-2">
                            <span className="text-muted-foreground flex items-center print:text-gray-600">
                              <Minus className="w-4 h-4 mr-1 text-red-500" />
                              IRRF ({resultado.aliquotaIRRF}%):
                            </span>
                            <span className="text-red-500 print:text-red-600">
                              -{formatCurrency(resultado.irrf)}
                            </span>
                          </div>
                        </div>

                        <div className="border-t-2 border-gold pt-3 print:border-foreground">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground font-medium print:text-gray-600">Valor Líquido:</span>
                            <span className="text-2xl font-bold text-gold print:text-foreground">
                              {formatCurrency(resultado.valorLiquido)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detalhamento dos Descontos */}
                    <div className="bg-muted rounded-lg p-4 print:bg-gray-50 print:border print:border-gray-300">
                      <h3 className="text-lg font-medium text-foreground mb-3 print:text-black">Detalhamento</h3>
                      
                      <div className="space-y-3 text-sm">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-muted-foreground print:text-gray-600">INSS:</span>
                            <Badge className="bg-primary text-primary-foreground print:bg-blue-100 print:text-blue-800 print:border print:border-blue-300">11%</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground print:text-gray-600">
                            Base: {formatCurrency(Math.min(resultado.valorBruto, resultado.tetoINSS))}
                          </p>
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-muted-foreground print:text-gray-600">IRRF:</span>
                            <Badge className="bg-secondary text-secondary-foreground print:bg-purple-100 print:text-purple-800 print:border print:border-purple-300">
                              {resultado.aliquotaIRRF}%
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground print:text-gray-600">
                            Base: {formatCurrency(resultado.valorBruto - resultado.inss)}
                          </p>
                        </div>

                        <div className="border-t border-border pt-2 print:border-gray-300">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground print:text-gray-600">Total de Descontos:</span>
                            <span className="text-foreground font-medium print:text-black">
                              {formatCurrency(resultado.totalDescontos)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Comparativo Anual */}
                    <div className="bg-muted rounded-lg p-4 print:bg-gray-50 print:border print:border-gray-300">
                      <h3 className="text-lg font-medium text-foreground mb-3 print:text-black">Projeção Anual</h3>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground print:text-gray-600">Pró-labore Bruto (12 meses):</span>
                          <span className="text-foreground print:text-black">
                            {formatCurrency(resultado.valorBruto * 12)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground print:text-gray-600">Total INSS (12 meses):</span>
                          <span className="text-red-500 print:text-red-600">
                            -{formatCurrency(resultado.inss * 12)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground print:text-gray-600">Total IRRF (12 meses):</span>
                          <span className="text-red-500 print:text-red-600">
                            -{formatCurrency(resultado.irrf * 12)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2 print:border-gray-300">
                          <span className="text-muted-foreground font-medium print:text-gray-600">Líquido Anual:</span>
                          <span className="text-gold font-bold print:text-foreground">
                            {formatCurrency(resultado.valorLiquido * 12)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Observações */}
                    <div className="bg-muted rounded-lg p-4 print:bg-gray-50 print:border print:border-gray-300">
                      <h3 className="text-lg font-medium text-foreground mb-3 print:text-black">Observações</h3>
                      <ul className="text-xs text-muted-foreground space-y-1 font-extralight print:text-gray-600">
                        <li>• Pró-labore não tem incidência de FGTS</li>
                        <li>• Valor mínimo obrigatório: 1 salário mínimo</li>
                        <li>• INSS limitado ao teto: R$ {formatCurrency(resultado.tetoINSS)}</li>
                        <li>• Cálculo baseado na tabela 2024</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="print:hidden">
                  <ResultActions 
                    resultData={resultado}
                    calculatorType="prolabore"
                  />
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProLaboreCalculator;
