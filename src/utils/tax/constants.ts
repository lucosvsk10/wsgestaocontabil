
// Constantes para o cálculo do IRPF (valores 2024)
export const TAX_CONSTANTS = {
  FAIXAS_IRPF: [
    { limite: 2259.20, aliquota: 0, deducao: 0 },
    { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
    { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
    { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
    { limite: Infinity, aliquota: 0.275, deducao: 896.00 }
  ],
  DEDUCAO_POR_DEPENDENTE: 2275.08,
  LIMITE_EDUCACAO: 3561.50,
  DESCONTO_SIMPLIFICADO_PERCENTUAL: 0.2,
  DESCONTO_SIMPLIFICADO_TETO: 16754.34,
  ISENCAO_APOSENTADOS_65: 24751.74
};
