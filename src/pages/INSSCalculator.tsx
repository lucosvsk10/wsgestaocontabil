import { useState } from "react";
import { motion } from "framer-motion";
import SimpleNavbar from "@/components/calculators/SimpleNavbar";
import ResultActions from "@/components/calculators/ResultActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, DollarSign, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const INSSCalculator = () => {
  const [categoria, setCategoria] = useState("");
  const [valor, setValor] = useState("");
  const [tipoFacultativo, setTipoFacultativo] = useState("");
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calcularINSS = () => {
    setLoading(true);
    
    const valorBase = parseFloat(valor) || 0;
    let contribuicao = 0;
    let aliquota = 0;
    let detalhes = "";

    // Valores 2024
    const salarioMinimo = 1412.00;
    const tetoINSS = 7786.02;

    switch (categoria) {
      case "clt":
        // Tabela progressiva CLT 2024
        if (valorBase <= 1412.00) {
          contribuicao = valorBase * 0.075;
          aliquota = 7.5;
        } else if (valorBase <= 2666.68) {
          contribuicao = 1412.00 * 0.075 + (valorBase - 1412.00) * 0.09;
          aliquota = 9;
        } else if (valorBase <= 4000.03) {
          contribuicao = 1412.00 * 0.075 + (2666.68 - 1412.00) * 0.09 + (valorBase - 2666.68) * 0.12;
          aliquota = 12;
        } else {
          contribuicao = 1412.00 * 0.075 + (2666.68 - 1412.00) * 0.09 + (4000.03 - 2666.68) * 0.12 + (Math.min(valorBase, tetoINSS) - 4000.03) * 0.14;
          aliquota = 14;
        }
        contribuicao = Math.min(contribuicao, tetoINSS * 0.14);
        detalhes = "Tabela progressiva aplicada conforme CLT";
        break;

      case "autonomo":
        const valorLimitado = Math.min(valorBase, tetoINSS);
        contribuicao = valorLimitado * 0.20; // 20% para autônomo
        aliquota = 20;
        detalhes = `20% sobre o valor declarado, limitado ao teto (R$ ${tetoINSS.toLocaleString('pt-BR')})`;
        break;

      case "mei":
        // MEI tem valor fixo mensal
        contribuicao = salarioMinimo * 0.05; // 5% do salário mínimo
        aliquota = 5;
        detalhes = `Valor fixo mensal: 5% do salário mínimo (R$ ${salarioMinimo.toLocaleString('pt-BR')})`;
        break;

      case "facultativo":
        const valorLimitadoFac = Math.min(valorBase, tetoINSS);
        switch (tipoFacultativo) {
          case "baixa_renda":
            contribuicao = salarioMinimo * 0.05;
            aliquota = 5;
            detalhes = "Plano Simplificado - 5% do salário mínimo";
            break;
          case "normal":
            contribuicao = valorLimitadoFac * 0.11;
            aliquota = 11;
            detalhes = "11% sobre o valor de contribuição";
            break;
          case "completo":
            contribuicao = valorLimitadoFac * 0.20;
            aliquota = 20;
            detalhes = "20% sobre o valor de contribuição";
            break;
        }
        break;
    }

    setResultado({
      categoria,
      valorBase,
      contribuicao,
      aliquota,
      detalhes,
      tetoINSS,
      salarioMinimo,
      tipoFacultativo
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
    setCategoria("");
    setValor("");
    setTipoFacultativo("");
    setResultado(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-prompt print:bg-white">
      <div className="print:hidden">
        <SimpleNavbar title="Calculadora INSS 2024" />
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
              Calculadora INSS 2024
            </h1>
            <p className="text-xl text-muted-foreground font-extralight print:text-gray-600 print:text-base">
              Calcule sua contribuição para o INSS conforme sua categoria
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
                  <Label className="font-extralight flex items-center print:text-black">
                    <Briefcase className="w-4 h-4 mr-1" />
                    Categoria de Contribuinte
                  </Label>
                  <Select value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger className="mt-1 print:bg-white print:border-gray-300 print:text-black">
                      <SelectValue placeholder="Selecione sua categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clt">CLT (Empregado)</SelectItem>
                      <SelectItem value="autonomo">Autônomo</SelectItem>
                      <SelectItem value="mei">MEI (Microempreendedor Individual)</SelectItem>
                      <SelectItem value="facultativo">Contribuinte Facultativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {categoria === "facultativo" && (
                  <div>
                    <Label className="font-extralight print:text-black">
                      Tipo de Contribuição Facultativa
                    </Label>
                    <Select value={tipoFacultativo} onValueChange={setTipoFacultativo}>
                      <SelectTrigger className="mt-1 print:bg-white print:border-gray-300 print:text-black">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa_renda">Plano Simplificado (5%)</SelectItem>
                        <SelectItem value="normal">Contribuição Normal (11%)</SelectItem>
                        <SelectItem value="completo">Contribuição Completa (20%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {categoria && categoria !== "mei" && (
                  <div>
                    <Label htmlFor="valor" className="font-extralight flex items-center print:text-black">
                      <DollarSign className="w-4 h-4 mr-1" />
                      {categoria === "clt" ? "Salário Mensal (R$)" : 
                       categoria === "facultativo" ? "Valor de Contribuição (R$)" :
                       "Valor Declarado (R$)"}
                    </Label>
                    <Input
                      id="valor"
                      type="number"
                      placeholder={categoria === "clt" ? "3000.00" : "1412.00"}
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      className="mt-1 print:bg-white print:border-gray-300 print:text-black"
                    />
                    {categoria === "clt" && (
                      <p className="text-xs text-muted-foreground mt-1 print:text-gray-600">
                        Teto INSS 2024: R$ 7.786,02
                      </p>
                    )}
                  </div>
                )}

                {categoria === "mei" && (
                  <div className="bg-muted rounded-lg p-4 print:bg-gray-50 print:border print:border-gray-300">
                    <p className="text-muted-foreground font-extralight print:text-gray-600">
                      <strong>MEI:</strong> Valor fixo mensal de 5% do salário mínimo.<br/>
                      Não é necessário informar valor de contribuição.
                    </p>
                  </div>
                )}

                <div className="flex gap-2 print:hidden">
                  <Button 
                    onClick={calcularINSS}
                    disabled={loading || !categoria || (categoria !== "mei" && !valor)}
                    className="flex-1 bg-gold hover:bg-gold-dark text-background font-extralight"
                  >
                    {loading ? "Calculando..." : "Calcular INSS"}
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
                      Resultado do Cálculo
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="bg-muted rounded-lg p-4 print:bg-gray-50 print:border print:border-gray-300">
                      <h3 className="text-lg font-medium text-foreground mb-3 print:text-black">Contribuição INSS</h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground print:text-gray-600">Categoria:</span>
                          <Badge className="bg-primary text-primary-foreground print:bg-blue-100 print:text-blue-800 print:border print:border-blue-300">
                            {resultado.categoria === "clt" ? "CLT" :
                             resultado.categoria === "autonomo" ? "Autônomo" :
                             resultado.categoria === "mei" ? "MEI" : "Facultativo"}
                          </Badge>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-muted-foreground print:text-gray-600">Alíquota:</span>
                          <span className="text-foreground font-medium print:text-black">{resultado.aliquota}%</span>
                        </div>

                        {resultado.categoria !== "mei" && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground print:text-gray-600">Valor Base:</span>
                            <span className="text-foreground print:text-black">{formatCurrency(resultado.valorBase)}</span>
                          </div>
                        )}

                        <div className="flex justify-between border-t border-border pt-3 print:border-gray-300">
                          <span className="text-muted-foreground print:text-gray-600">Contribuição Mensal:</span>
                          <span className="text-2xl font-bold text-gold print:text-foreground">
                            {formatCurrency(resultado.contribuicao)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted rounded-lg p-4 print:bg-gray-50 print:border print:border-gray-300">
                      <h3 className="text-lg font-medium text-foreground mb-3 print:text-black">Detalhes</h3>
                      <p className="text-muted-foreground font-extralight text-sm print:text-gray-600">
                        {resultado.detalhes}
                      </p>
                    </div>

                    <div className="bg-muted rounded-lg p-4 print:bg-gray-50 print:border print:border-gray-300">
                      <h3 className="text-lg font-medium text-foreground mb-3 print:text-black">Valores Anuais</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground print:text-gray-600">Contribuição Anual:</span>
                          <span className="text-foreground font-medium print:text-black">
                            {formatCurrency(resultado.contribuicao * 12)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted rounded-lg p-4 print:bg-gray-50 print:border print:border-gray-300">
                      <h3 className="text-lg font-medium text-foreground mb-3 print:text-black">Referências 2024</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground print:text-gray-600">Salário Mínimo:</span>
                          <span className="text-foreground print:text-black">{formatCurrency(resultado.salarioMinimo)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground print:text-gray-600">Teto INSS:</span>
                          <span className="text-foreground print:text-black">{formatCurrency(resultado.tetoINSS)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="print:hidden">
                  <ResultActions 
                    resultData={resultado}
                    calculatorType="inss"
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

export default INSSCalculator;
