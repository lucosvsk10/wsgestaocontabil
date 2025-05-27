
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { currencyFormat } from "@/utils/taxCalculations";

interface IRPFFormData {
  rendimentoTributavel: number;
  dependentes: number;
  previdenciaOficial: number;
  pensaoAlimenticia: number;
  outrasDeducoes: number;
  clienteNome?: string;
}

interface IRPFResult {
  baseCalculo: number;
  totalDeducoes: number;
  impostoDevido: number;
  aliquotaEfetiva: number;
}

const IRPFCalculator: React.FC = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<IRPFFormData>({
    rendimentoTributavel: 0,
    dependentes: 0,
    previdenciaOficial: 0,
    pensaoAlimenticia: 0,
    outrasDeducoes: 0,
    clienteNome: "",
  });
  const [result, setResult] = useState<IRPFResult | null>(null);

  const DEDUCAO_POR_DEPENDENTE = 2275.08;

  const calculateIRPF = (data: IRPFFormData): IRPFResult => {
    const deducaoDependentes = data.dependentes * DEDUCAO_POR_DEPENDENTE;
    const totalDeducoes = data.previdenciaOficial + data.pensaoAlimenticia + data.outrasDeducoes + deducaoDependentes;
    const baseCalculo = Math.max(data.rendimentoTributavel - totalDeducoes, 0);
    
    let impostoDevido = 0;
    
    // Faixas progressivas IRPF 2024 (anual)
    if (baseCalculo <= 27110.40) {
      impostoDevido = 0;
    } else if (baseCalculo <= 33919.80) {
      impostoDevido = (baseCalculo - 27110.40) * 0.075;
    } else if (baseCalculo <= 45012.60) {
      impostoDevido = (33919.80 - 27110.40) * 0.075 + (baseCalculo - 33919.80) * 0.15;
    } else if (baseCalculo <= 55976.16) {
      impostoDevido = (33919.80 - 27110.40) * 0.075 + (45012.60 - 33919.80) * 0.15 + (baseCalculo - 45012.60) * 0.225;
    } else {
      impostoDevido = (33919.80 - 27110.40) * 0.075 + (45012.60 - 33919.80) * 0.15 + (55976.16 - 45012.60) * 0.225 + (baseCalculo - 55976.16) * 0.275;
    }

    const aliquotaEfetiva = data.rendimentoTributavel > 0 ? (impostoDevido / data.rendimentoTributavel) * 100 : 0;

    return {
      baseCalculo,
      totalDeducoes,
      impostoDevido,
      aliquotaEfetiva,
    };
  };

  const handleCalculate = () => {
    if (formData.rendimentoTributavel <= 0) {
      toast({
        title: "Erro",
        description: "Informe um rendimento tributável válido",
        variant: "destructive",
      });
      return;
    }

    const calculatedResult = calculateIRPF(formData);
    setResult(calculatedResult);
  };

  const handleInputChange = (field: keyof IRPFFormData, value: string | number) => {
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
            Simulador de IRPF
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
                Rendimento Tributável Anual (R$)
              </Label>
              <Input
                type="number"
                value={formData.rendimentoTributavel}
                onChange={(e) => handleInputChange('rendimentoTributavel', e.target.value)}
                placeholder="0,00"
                className="font-extralight"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[#020817] dark:text-white font-extralight">
                Número de Dependentes
              </Label>
              <Input
                type="number"
                value={formData.dependentes}
                onChange={(e) => handleInputChange('dependentes', e.target.value)}
                placeholder="0"
                min="0"
                className="font-extralight"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[#020817] dark:text-white font-extralight">
                Previdência Oficial (R$)
              </Label>
              <Input
                type="number"
                value={formData.previdenciaOficial}
                onChange={(e) => handleInputChange('previdenciaOficial', e.target.value)}
                placeholder="0,00"
                className="font-extralight"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[#020817] dark:text-white font-extralight">
                Pensão Alimentícia (R$)
              </Label>
              <Input
                type="number"
                value={formData.pensaoAlimenticia}
                onChange={(e) => handleInputChange('pensaoAlimenticia', e.target.value)}
                placeholder="0,00"
                className="font-extralight"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[#020817] dark:text-white font-extralight">
                Outras Deduções (R$)
              </Label>
              <Input
                type="number"
                value={formData.outrasDeducoes}
                onChange={(e) => handleInputChange('outrasDeducoes', e.target.value)}
                placeholder="0,00"
                className="font-extralight"
              />
            </div>
          </div>

          <Button
            onClick={handleCalculate}
            className="w-full bg-[#020817] hover:bg-[#0f172a] text-white dark:bg-transparent dark:border dark:border-[#efc349] dark:text-[#efc349] dark:hover:bg-[#efc349]/10 font-extralight"
          >
            Calcular IRPF
          </Button>

          {result && (
            <div className="mt-8 p-6 bg-gray-50 dark:bg-[#020817] rounded-lg border border-gray-200 dark:border-[#efc349]/30">
              <h3 className="text-lg text-[#020817] dark:text-[#efc349] mb-4 font-extralight">
                Resultado da Simulação
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-white/70 font-extralight">Base de Cálculo</p>
                  <p className="text-xl text-[#020817] dark:text-white font-extralight">
                    {currencyFormat(result.baseCalculo)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-white/70 font-extralight">Total de Deduções</p>
                  <p className="text-xl text-[#020817] dark:text-white font-extralight">
                    {currencyFormat(result.totalDeducoes)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-white/70 font-extralight">Imposto Devido</p>
                  <p className="text-xl text-green-600 dark:text-green-400 font-extralight">
                    {currencyFormat(result.impostoDevido)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-white/70 font-extralight">Alíquota Efetiva</p>
                  <p className="text-xl text-[#020817] dark:text-white font-extralight">
                    {result.aliquotaEfetiva.toFixed(2)}%
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

export default IRPFCalculator;
