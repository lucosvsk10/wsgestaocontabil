
import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
    setCategoria("");
    setValor("");
    setTipoFacultativo("");
    setResultado(null);
  };

  return (
    <div className="min-h-screen bg-[#020817] text-white font-extralight">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-extralight text-[#efc349] mb-4">
              Calculadora INSS 2024
            </h1>
            <p className="text-xl text-gray-300 font-extralight">
              Calcule sua contribuição para o INSS conforme sua categoria
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Formulário */}
            <Card className="bg-[#0b1320] border-[#efc349]/20">
              <CardHeader>
                <CardTitle className="text-[#efc349] font-extralight flex items-center">
                  <Calculator className="w-6 h-6 mr-2" />
                  Dados para Cálculo
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-white font-extralight flex items-center">
                    <Briefcase className="w-4 h-4 mr-1" />
                    Categoria de Contribuinte
                  </Label>
                  <Select value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger className="bg-[#020817] border-[#efc349]/30 text-white mt-1">
                      <SelectValue placeholder="Selecione sua categoria" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#020817] border-[#efc349]/30">
                      <SelectItem value="clt">CLT (Empregado)</SelectItem>
                      <SelectItem value="autonomo">Autônomo</SelectItem>
                      <SelectItem value="mei">MEI (Microempreendedor Individual)</SelectItem>
                      <SelectItem value="facultativo">Contribuinte Facultativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {categoria === "facultativo" && (
                  <div>
                    <Label className="text-white font-extralight">
                      Tipo de Contribuição Facultativa
                    </Label>
                    <Select value={tipoFacultativo} onValueChange={setTipoFacultativo}>
                      <SelectTrigger className="bg-[#020817] border-[#efc349]/30 text-white mt-1">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#020817] border-[#efc349]/30">
                        <SelectItem value="baixa_renda">Plano Simplificado (5%)</SelectItem>
                        <SelectItem value="normal">Contribuição Normal (11%)</SelectItem>
                        <SelectItem value="completo">Contribuição Completa (20%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {categoria && categoria !== "mei" && (
                  <div>
                    <Label htmlFor="valor" className="text-white font-extralight flex items-center">
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
                      className="bg-[#020817] border-[#efc349]/30 text-white mt-1"
                    />
                    {categoria === "clt" && (
                      <p className="text-xs text-gray-400 mt-1">
                        Teto INSS 2024: R$ 7.786,02
                      </p>
                    )}
                  </div>
                )}

                {categoria === "mei" && (
                  <div className="bg-[#020817] rounded-lg p-4">
                    <p className="text-gray-300 font-extralight">
                      <strong>MEI:</strong> Valor fixo mensal de 5% do salário mínimo.<br/>
                      Não é necessário informar valor de contribuição.
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={calcularINSS}
                    disabled={loading || !categoria || (categoria !== "mei" && !valor)}
                    className="flex-1 bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817] font-extralight"
                  >
                    {loading ? "Calculando..." : "Calcular INSS"}
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
                      Resultado do Cálculo
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="bg-[#020817] rounded-lg p-4">
                      <h3 className="text-lg font-medium text-white mb-3">Contribuição INSS</h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Categoria:</span>
                          <Badge className="bg-blue-600 hover:bg-blue-700">
                            {resultado.categoria === "clt" ? "CLT" :
                             resultado.categoria === "autonomo" ? "Autônomo" :
                             resultado.categoria === "mei" ? "MEI" : "Facultativo"}
                          </Badge>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-400">Alíquota:</span>
                          <span className="text-white font-medium">{resultado.aliquota}%</span>
                        </div>

                        {resultado.categoria !== "mei" && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Valor Base:</span>
                            <span className="text-white">{formatCurrency(resultado.valorBase)}</span>
                          </div>
                        )}

                        <div className="flex justify-between border-t border-[#efc349]/20 pt-3">
                          <span className="text-gray-400">Contribuição Mensal:</span>
                          <span className="text-2xl font-bold text-[#efc349]">
                            {formatCurrency(resultado.contribuicao)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#020817] rounded-lg p-4">
                      <h3 className="text-lg font-medium text-white mb-3">Detalhes</h3>
                      <p className="text-gray-300 font-extralight text-sm">
                        {resultado.detalhes}
                      </p>
                    </div>

                    <div className="bg-[#020817] rounded-lg p-4">
                      <h3 className="text-lg font-medium text-white mb-3">Valores Anuais</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Contribuição Anual:</span>
                          <span className="text-white font-medium">
                            {formatCurrency(resultado.contribuicao * 12)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#020817] rounded-lg p-4">
                      <h3 className="text-lg font-medium text-white mb-3">Referências 2024</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Salário Mínimo:</span>
                          <span className="text-white">{formatCurrency(resultado.salarioMinimo)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Teto INSS:</span>
                          <span className="text-white">{formatCurrency(resultado.tetoINSS)}</span>
                        </div>
                      </div>
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

export default INSSCalculator;
