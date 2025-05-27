
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { currencyFormat } from "@/utils/taxCalculations";

interface INSSFormData {
  salarioBruto: number;
  clienteNome?: string;
}

interface INSSResult {
  totalINSS: number;
  aliquotaAplicada: number;
  faixaAtingida: string;
  salarioLiquido: number;
}

const INSSCalculator: React.FC = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<INSSFormData>({
    salarioBruto: 0,
    clienteNome: "",
  });
  const [result, setResult] = useState<INSSResult | null>(null);

  const calculateINSS = (salarioBruto: number): INSSResult => {
    let totalINSS = 0;
    let faixaAtingida = "";
    let aliquotaAplicada = 0;

    // Faixas INSS 2024
    const faixas = [
      { min: 0, max: 1412.00, aliquota: 0.075 },
      { min: 1412.01, max: 2666.68, aliquota: 0.09 },
      { min: 2666.69, max: 4000.03, aliquota: 0.12 },
      { min: 4000.04, max: 7786.02, aliquota: 0.14 },
    ];

    for (const faixa of faixas) {
      if (salarioBruto > faixa.min) {
        const valorFaixa = Math.min(salarioBruto, faixa.max) - Math.max(0, faixa.min - 0.01);
        if (valorFaixa > 0) {
          totalINSS += valorFaixa * faixa.aliquota;
          faixaAtingida = `${currencyFormat(faixa.min)} - ${currencyFormat(faixa.max)}`;
          aliquotaAplicada = faixa.aliquota * 100;
        }
      }
    }

    // Teto do INSS
    const tetoINSS = 908.85; // Valor máximo de contribuição 2024
    totalINSS = Math.min(totalINSS, tetoINSS);

    const salarioLiquido = salarioBruto - totalINSS;

    return {
      totalINSS,
      aliquotaAplicada,
      faixaAtingida,
      salarioLiquido,
    };
  };

  const handleCalculate = () => {
    if (formData.salarioBruto <= 0) {
      toast({
        title: "Erro",
        description: "Informe um salário bruto válido",
        variant: "destructive",
      });
      return;
    }

    const calculatedResult = calculateINSS(formData.salarioBruto);
    setResult(calculatedResult);
  };

  const handleInputChange = (field: keyof INSSFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? parseFloat(value) || 0 : value
    }));
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
        <CardHeader>
          <CardTitle className="text-xl text-[#020817] dark:text-[#efc349] font-extralight">
            Calculadora de INSS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-[#020817] dark:text-white font-extralight">
                Nome do Cliente (opcional)
              </Label>
              <Input
                type="text"
                value={formData.clienteNome}
                onChange={(e) => handleInputChange('clienteNome', e.target.value)}
                placeholder="Nome do cliente"
                className="font-extralight"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[#020817] dark:text-white font-extralight">
                Salário Bruto Mensal (R$)
              </Label>
              <Input
                type="number"
                value={formData.salarioBruto}
                onChange={(e) => handleInputChange('salarioBruto', e.target.value)}
                placeholder="0,00"
                className="font-extralight"
              />
            </div>
          </div>

          <Button
            onClick={handleCalculate}
            className="w-full bg-[#020817] hover:bg-[#0f172a] text-white dark:bg-transparent dark:border dark:border-[#efc349] dark:text-[#efc349] dark:hover:bg-[#efc349]/10 font-extralight"
          >
            Calcular INSS
          </Button>

          {result && (
            <div className="mt-8 p-6 bg-gray-50 dark:bg-[#020817] rounded-lg border border-gray-200 dark:border-[#efc349]/30">
              <h3 className="text-lg text-[#020817] dark:text-[#efc349] mb-4 font-extralight">
                Resultado do Cálculo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-white/70 font-extralight">Total INSS Devido</p>
                  <p className="text-xl text-red-600 dark:text-red-400 font-extralight">
                    {currencyFormat(result.totalINSS)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-white/70 font-extralight">Alíquota Aplicada</p>
                  <p className="text-xl text-[#020817] dark:text-white font-extralight">
                    {result.aliquotaAplicada.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-white/70 font-extralight">Faixa Atingida</p>
                  <p className="text-lg text-[#020817] dark:text-white font-extralight">
                    {result.faixaAtingida}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-white/70 font-extralight">Salário Líquido</p>
                  <p className="text-xl text-green-600 dark:text-green-400 font-extralight">
                    {currencyFormat(result.salarioLiquido)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default INSSCalculator;
