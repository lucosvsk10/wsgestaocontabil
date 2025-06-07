import { useState } from "react";
import { motion } from "framer-motion";
import SimpleNavbar from "@/components/calculators/SimpleNavbar";
import ResultActions from "@/components/calculators/ResultActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, DollarSign, Users, Heart, GraduationCap, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TaxCalculator = () => {
  const [formData, setFormData] = useState({
    rendimentoBruto: "",
    inss: "",
    dependentes: "",
    educacao: "",
    saude: "",
    outrasDeducoes: "",
    nome: "",
    email: "",
    telefone: ""
  });
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calcularIRPF = () => {
    setLoading(true);
    const rendimentoBruto = parseFloat(formData.rendimentoBruto) || 0;
    const inss = parseFloat(formData.inss) || 0;
    const dependentes = parseInt(formData.dependentes) || 0;
    const educacao = parseFloat(formData.educacao) || 0;
    const saude = parseFloat(formData.saude) || 0;
    const outrasDeducoes = parseFloat(formData.outrasDeducoes) || 0;

    // Valores atualizados para 2024 da Receita Federal
    const deducaoPorDependente = 2275.08;
    const deducaoEducacaoMax = 3561.50;

    // Calcular base de cálculo
    let baseCalculo = rendimentoBruto - inss;
    baseCalculo -= dependentes * deducaoPorDependente;
    baseCalculo -= Math.min(educacao, deducaoEducacaoMax);
    baseCalculo -= saude; // Saúde sem limite
    baseCalculo -= outrasDeducoes;

    // Garantir que base não seja negativa
    baseCalculo = Math.max(baseCalculo, 0);

    // Tabela progressiva do IRPF 2024
    let impostoDevido = 0;
    let aliquotaEfetiva = 0;
    if (baseCalculo <= 22847.76) {
      impostoDevido = 0;
      aliquotaEfetiva = 0;
    } else if (baseCalculo <= 33919.80) {
      impostoDevido = (baseCalculo - 22847.76) * 0.075;
      aliquotaEfetiva = 7.5;
    } else if (baseCalculo <= 45012.60) {
      impostoDevido = (33919.80 - 22847.76) * 0.075 + (baseCalculo - 33919.80) * 0.15;
      aliquotaEfetiva = 15;
    } else if (baseCalculo <= 55976.16) {
      impostoDevido = (33919.80 - 22847.76) * 0.075 + (45012.60 - 33919.80) * 0.15 + (baseCalculo - 45012.60) * 0.225;
      aliquotaEfetiva = 22.5;
    } else {
      impostoDevido = (33919.80 - 22847.76) * 0.075 + (45012.60 - 33919.80) * 0.15 + (55976.16 - 45012.60) * 0.225 + (baseCalculo - 55976.16) * 0.275;
      aliquotaEfetiva = 27.5;
    }

    const resultado = {
      rendimentoBruto,
      inss,
      dependentes,
      educacao: Math.min(educacao, deducaoEducacaoMax),
      saude,
      outrasDeducoes,
      baseCalculo,
      impostoDevido,
      aliquotaEfetiva,
      totalDeducoes: inss + dependentes * deducaoPorDependente + Math.min(educacao, deducaoEducacaoMax) + saude + outrasDeducoes
    };
    setResultado(resultado);
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-prompt print:bg-white">
      <div className="print:hidden">
        <SimpleNavbar title="Simulador IRPF 2024" />
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
              Simulador IRPF 2024
            </h1>
            <p className="text-xl text-muted-foreground font-extralight print:text-gray-600 print:text-base">
              Calcule seu Imposto de Renda com base na tabela oficial da Receita Federal
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Formulário */}
            <Card className="print:bg-white print:border-gray-300">
              <CardHeader>
                <CardTitle className="font-extralight flex items-center print:text-foreground">
                  <Calculator className="w-6 h-6 mr-2" />
                  Dados para Cálculo
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="rendimentoBruto" className="font-extralight flex items-center print:text-black">
                    <DollarSign className="w-4 h-4 mr-1" />
                    Rendimento Bruto Anual (R$)
                  </Label>
                  <Input 
                    id="rendimentoBruto" 
                    type="number" 
                    placeholder="100000.00" 
                    value={formData.rendimentoBruto} 
                    onChange={e => handleInputChange("rendimentoBruto", e.target.value)} 
                    className="mt-1 print:bg-white print:border-gray-300 print:text-black" 
                  />
                </div>

                <div>
                  <Label htmlFor="inss" className="font-extralight flex items-center print:text-black">
                    <Home className="w-4 h-4 mr-1" />
                    INSS Pago (R$)
                  </Label>
                  <Input 
                    id="inss" 
                    type="number" 
                    placeholder="7507.49" 
                    value={formData.inss} 
                    onChange={e => handleInputChange("inss", e.target.value)} 
                    className="mt-1 print:bg-white print:border-gray-300 print:text-black" 
                  />
                </div>

                <div>
                  <Label htmlFor="dependentes" className="font-extralight flex items-center print:text-black">
                    <Users className="w-4 h-4 mr-1" />
                    Número de Dependentes
                  </Label>
                  <Input 
                    id="dependentes" 
                    type="number" 
                    placeholder="0" 
                    value={formData.dependentes} 
                    onChange={e => handleInputChange("dependentes", e.target.value)} 
                    className="mt-1 print:bg-white print:border-gray-300 print:text-black" 
                  />
                </div>

                <div>
                  <Label htmlFor="educacao" className="font-extralight flex items-center print:text-black">
                    <GraduationCap className="w-4 h-4 mr-1" />
                    Gastos com Educação (R$)
                  </Label>
                  <Input 
                    id="educacao" 
                    type="number" 
                    placeholder="3561.50" 
                    value={formData.educacao} 
                    onChange={e => handleInputChange("educacao", e.target.value)} 
                    className="mt-1 print:bg-white print:border-gray-300 print:text-black" 
                  />
                  <p className="text-xs text-muted-foreground mt-1 print:text-gray-600">Limite: R$ 3.561,50 por dependente</p>
                </div>

                <div>
                  <Label htmlFor="saude" className="font-extralight flex items-center print:text-black">
                    <Heart className="w-4 h-4 mr-1" />
                    Gastos com Saúde (R$)
                  </Label>
                  <Input 
                    id="saude" 
                    type="number" 
                    placeholder="5000.00" 
                    value={formData.saude} 
                    onChange={e => handleInputChange("saude", e.target.value)} 
                    className="mt-1 print:bg-white print:border-gray-300 print:text-black" 
                  />
                  <p className="text-xs text-muted-foreground mt-1 print:text-gray-600">Sem limite de valor</p>
                </div>

                <div>
                  <Label htmlFor="outrasDeducoes" className="font-extralight print:text-black">
                    Outras Deduções (R$)
                  </Label>
                  <Input 
                    id="outrasDeducoes" 
                    type="number" 
                    placeholder="0.00" 
                    value={formData.outrasDeducoes} 
                    onChange={e => handleInputChange("outrasDeducoes", e.target.value)} 
                    className="mt-1 print:bg-white print:border-gray-300 print:text-black" 
                  />
                </div>

                <div className="print:hidden">
                  <Button 
                    onClick={calcularIRPF} 
                    disabled={loading || !formData.rendimentoBruto} 
                    className="w-full bg-gold hover:bg-gold-dark text-background font-extralight"
                  >
                    {loading ? "Calculando..." : "Calcular IRPF"}
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
                      Resultado do Cálculo
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-muted rounded-lg p-4 print:bg-gray-50 print:border print:border-gray-300">
                        <h3 className="text-lg font-medium text-foreground mb-3 print:text-black">Resumo</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground print:text-gray-600">Rendimento Bruto:</span>
                            <span className="text-foreground print:text-black">{formatCurrency(resultado.rendimentoBruto)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground print:text-gray-600">Total de Deduções:</span>
                            <span className="text-foreground print:text-black">{formatCurrency(resultado.totalDeducoes)}</span>
                          </div>
                          <div className="flex justify-between border-t border-border pt-2 print:border-gray-300">
                            <span className="text-muted-foreground print:text-gray-600">Base de Cálculo:</span>
                            <span className="text-foreground font-medium print:text-black">{formatCurrency(resultado.baseCalculo)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-muted rounded-lg p-4 print:bg-gray-50 print:border print:border-gray-300">
                        <h3 className="text-lg font-medium text-foreground mb-3 print:text-black">Imposto</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground print:text-gray-600">Alíquota Efetiva:</span>
                            <Badge className="bg-primary text-primary-foreground print:bg-blue-100 print:text-blue-800 print:border print:border-blue-300">
                              {resultado.aliquotaEfetiva}%
                            </Badge>
                          </div>
                          <div className="flex justify-between border-t border-border pt-2 print:border-gray-300">
                            <span className="text-muted-foreground print:text-gray-600">Imposto Devido:</span>
                            <span className="text-2xl font-bold text-gold print:text-foreground">
                              {formatCurrency(resultado.impostoDevido)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-muted rounded-lg p-4 print:bg-gray-50 print:border print:border-gray-300">
                        <h3 className="text-lg font-medium text-foreground mb-3 print:text-black">Deduções Utilizadas</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground print:text-gray-600">INSS:</span>
                            <span className="text-foreground print:text-black">{formatCurrency(resultado.inss)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground print:text-gray-600">Dependentes ({resultado.dependentes}):</span>
                            <span className="text-foreground print:text-black">{formatCurrency(resultado.dependentes * 2275.08)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground print:text-gray-600">Educação:</span>
                            <span className="text-foreground print:text-black">{formatCurrency(resultado.educacao)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground print:text-gray-600">Saúde:</span>
                            <span className="text-foreground print:text-black">{formatCurrency(resultado.saude)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground print:text-gray-600">Outras:</span>
                            <span className="text-foreground print:text-black">{formatCurrency(resultado.outrasDeducoes)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="print:hidden">
                  <ResultActions 
                    resultData={resultado}
                    calculatorType="irpf"
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

export default TaxCalculator;
