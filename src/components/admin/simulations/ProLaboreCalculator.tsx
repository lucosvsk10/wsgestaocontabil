
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { currencyFormat } from "@/utils/taxCalculations";

interface ProLaboreFormData {
  valorBruto: number;
  regimeTributario: "simples" | "lucro";
  deducaoINSS: boolean;
  clienteNome?: string;
}

interface ProLaboreResult {
  inssDescontado: number;
  irrf: number;
  valorLiquido: number;
  baseCalculo: number;
}

const ProLaboreCalculator: React.FC = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ProLaboreFormData>({
    valorBruto: 0,
    regimeTributario: "simples",
    deducaoINSS: true,
    clienteNome: "",
  });
  const [result, setResult] = useState<ProLaboreResult | null>(null);

  const calculateProLabore = (data: ProLaboreFormData): ProLaboreResult => {
    let inssDescontado = 0;
    let irrf = 0;
    let baseCalculo = data.valorBruto;

    // Cálculo do INSS sobre pró-labore
    if (data.deducaoINSS) {
      const aliquotaINSS = 0.11; // 11% para pró-labore
      const tetoINSS = 7786.02; // Teto INSS 2024
      const valorParaINSS = Math.min(data.valorBruto, tetoINSS);
      inssDescontado = valorParaINSS * aliquotaINSS;
      baseCalculo = data.valorBruto - inssDescontado;
    }

    // Cálculo do IRRF
    const faixasIRRF = [
      { min: 0, max: 2259.20, aliquota: 0, deducao: 0 },
      { min: 2259.21, max: 2826.65, aliquota: 0.075, deducao: 169.44 },
      { min: 2826.66, max: 3751.05, aliquota: 0.15, deducao: 381.44 },
      { min: 3751.06, max: 4664.68, aliquota: 0.225, deducao: 662.77 },
      { min: 4664.69, max: Infinity, aliquota: 0.275, deducao: 896.00 },
    ];

    for (const faixa of faixasIRRF) {
      if (baseCalculo >= faixa.min && baseCalculo <= faixa.max) {
        if (faixa.aliquota > 0) {
          irrf = Math.max(0, baseCalculo * faixa.aliquota - faixa.deducao);
        }
        break;
      }
    }

    const valorLiquido = data.valorBruto - inssDescontado - irrf;

    return {
      inssDescontado,
      irrf,
      valorLiquido,
      baseCalculo,
    };
  };

  const handleCalculate = () => {
    if (formData.valorBruto <= 0) {
      toast({
        title: "Erro",
        description: "Informe um valor bruto válido",
        variant: "destructive",
      });
      return;
    }

    const calculatedResult = calculateProLabore(formData);
    setResult(calculatedResult);
  };

  const handleInputChange = (field: keyof ProLaboreFormData, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'valorBruto' && typeof value === 'string' ? parseFloat(value) || 0 : value
    }));
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
        <CardHeader>
          <CardTitle className="text-xl text-[#020817] dark:text-[#efc349] font-extralight">
            Simulador de Pró-Labore
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
                Valor Bruto do Pró-Labore (R$)
              </Label>
              <Input
                type="number"
                value={formData.valorBruto}
                onChange={(e) => handleInputChange('valorBruto', e.target.value)}
                placeholder="0,00"
                className="font-extralight"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[#020817] dark:text-white font-extralight">
                Regime Tributário da Empresa
              </Label>
              <Select 
                value={formData.regimeTributario} 
                onValueChange={(value) => handleInputChange('regimeTributario', value as "simples" | "lucro")}
              >
                <SelectTrigger className="font-extralight">
                  <SelectValue placeholder="Selecione o regime" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples">Simples Nacional</SelectItem>
                  <SelectItem value="lucro">Lucro Presumido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="deducaoINSS"
                  checked={formData.deducaoINSS}
                  onCheckedChange={(checked) => handleInputChange('deducaoINSS', checked as boolean)}
                />
                <Label htmlFor="deducaoINSS" className="text-[#020817] dark:text-white font-extralight">
                  Aplicar dedução de INSS
                </Label>
              </div>
            </div>
          </div>

          <Button
            onClick={handleCalculate}
            className="w-full bg-[#020817] hover:bg-[#0f172a] text-white dark:bg-transparent dark:border dark:border-[#efc349] dark:text-[#efc349] dark:hover:bg-[#efc349]/10 font-extralight"
          >
            Calcular Pró-Labore
          </Button>

          {result && (
            <div className="mt-8 p-6 bg-gray-50 dark:bg-[#020817] rounded-lg border border-gray-200 dark:border-[#efc349]/30">
              <h3 className="text-lg text-[#020817] dark:text-[#efc349] mb-4 font-extralight">
                Resultado do Cálculo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-white/70 font-extralight">INSS Descontado</p>
                  <p className="text-xl text-red-600 dark:text-red-400 font-extralight">
                    {currencyFormat(result.inssDescontado)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-white/70 font-extralight">IRRF</p>
                  <p className="text-xl text-red-600 dark:text-red-400 font-extralight">
                    {currencyFormat(result.irrf)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-white/70 font-extralight">Base de Cálculo</p>
                  <p className="text-xl text-[#020817] dark:text-white font-extralight">
                    {currencyFormat(result.baseCalculo)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-white/70 font-extralight">Valor Líquido</p>
                  <p className="text-xl text-green-600 dark:text-green-400 font-extralight">
                    {currencyFormat(result.valorLiquido)}
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

export default ProLaboreCalculator;
