
import { useState } from "react";

export interface ProLaboreResult {
  valorBruto: number;
  inss: number;
  irrf: number;
  aliquotaIRRF: number;
  totalDescontos: number;
  valorLiquido: number;
  tetoINSS: number;
  salarioMinimo: number;
}

export const useProLaboreCalculation = () => {
  const [valorBruto, setValorBruto] = useState("");
  const [resultado, setResultado] = useState<ProLaboreResult | null>(null);
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
      irrf = baseIRRF * 0.075 - 158.40;
      aliquotaIRRF = 7.5;
    } else if (baseIRRF <= 3751.05) {
      irrf = baseIRRF * 0.15 - 370.40;
      aliquotaIRRF = 15;
    } else if (baseIRRF <= 4664.68) {
      irrf = baseIRRF * 0.225 - 651.73;
      aliquotaIRRF = 22.5;
    } else {
      irrf = baseIRRF * 0.275 - 884.96;
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

  return {
    valorBruto,
    setValorBruto,
    resultado,
    loading,
    calcularProLabore,
    formatCurrency,
    resetForm
  };
};
