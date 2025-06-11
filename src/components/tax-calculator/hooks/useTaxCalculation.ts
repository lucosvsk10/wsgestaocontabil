
import { useState } from "react";

interface TaxFormData {
  rendimentoBruto: string;
  inss: string;
  dependentes: string;
  educacao: string;
  saude: string;
  outrasDeducoes: string;
  nome: string;
  email: string;
  telefone: string;
}

interface TaxResult {
  rendimentoBruto: number;
  inss: number;
  dependentes: number;
  educacao: number;
  saude: number;
  outrasDeducoes: number;
  baseCalculo: number;
  impostoDevido: number;
  aliquotaEfetiva: number;
  totalDeducoes: number;
}

export const useTaxCalculation = () => {
  const [formData, setFormData] = useState<TaxFormData>({
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
  const [resultado, setResultado] = useState<TaxResult | null>(null);
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

    const resultado: TaxResult = {
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

  return {
    formData,
    resultado,
    loading,
    handleInputChange,
    calcularIRPF,
    formatCurrency
  };
};
