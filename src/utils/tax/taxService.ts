import { TAX_CONSTANTS } from './constants';
import { TaxFormInput, TaxResult } from './types';
import { calculateTaxBrackets, calculateTaxByBrackets, getLimiteEducacao } from './calculations';

/**
 * Calcula a base de cálculo para a declaração completa, considerando todas as deduções permitidas.
 */
const calculateBaseForCompleteDeclaration = (data: TaxFormInput): number => {
  let base = data.rendimentosTributaveis;
  
  // Dedução de contribuições previdenciárias
  base -= data.contribuicaoPrevidenciaria;
  
  // Dedução de despesas médicas
  base -= data.despesasMedicas;
  
  // Dedução de despesas com educação, respeitando o limite
  base -= Math.min(data.despesasEducacao, getLimiteEducacao(data.numeroDependentes));
  
  // Dedução por dependentes
  base -= data.numeroDependentes * TAX_CONSTANTS.DEDUCAO_POR_DEPENDENTE;
  
  // Dedução de pensão alimentícia
  base -= data.pensaoAlimenticia;

  // Dedução do livro caixa
  base -= data.livroCaixa;
  
  // Isenção para maiores de 65 anos
  if (data.ehAposentado65) {
    base = Math.max(0, base - TAX_CONSTANTS.ISENCAO_APOSENTADOS_65);
  }
  
  return Math.max(0, base); // Garante que a base não seja negativa
};

/**
 * Calcula o desconto simplificado, limitado a 20% dos rendimentos tributáveis ou ao teto estabelecido.
 */
const calculateSimplifiedDiscount = (rendimentosTributaveis: number): number => {
  const desconto = rendimentosTributaveis * TAX_CONSTANTS.DESCONTO_SIMPLIFICADO_PERCENTUAL;
  return Math.min(desconto, TAX_CONSTANTS.DESCONTO_SIMPLIFICADO_TETO);
};

/**
 * Calcula o total de deduções permitidas na declaração completa.
 */
const calculateDeductions = (data: TaxFormInput): number => {
  let total = 0;
  
  total += data.contribuicaoPrevidenciaria;
  total += data.despesasMedicas;
  total += Math.min(data.despesasEducacao, getLimiteEducacao(data.numeroDependentes));
  total += data.numeroDependentes * TAX_CONSTANTS.DEDUCAO_POR_DEPENDENTE;
  total += data.pensaoAlimenticia;
  total += data.livroCaixa;
  
  return total;
};

// Add the calculateTaxes export
export const calculateTaxes = (data: TaxFormInput): TaxResult => {
  // Calculate base income after deductions
  const baseDeCalcCompleta = calculateBaseForCompleteDeclaration(data);
  const descontoSimplificado = calculateSimplifiedDiscount(data.rendimentosTributaveis);
  const baseDeCalcSimplificada = Math.max(0, data.rendimentosTributaveis - descontoSimplificado);

  // Calculate tax for both declaration types
  const impostoDevidoCompleto = calculateTaxBrackets(baseDeCalcCompleta);
  const impostoDevidoSimplificado = calculateTaxBrackets(baseDeCalcSimplificada);

  // Choose recommended declaration type
  const declaracaoRecomendada = 
    impostoDevidoCompleto <= impostoDevidoSimplificado ? 'completa' : 'simplificada';

  // Calculate tax by brackets for detailed view
  const impostoFaixas = calculateTaxByBrackets(
    data.tipoDeclaracao === 'completa' ? baseDeCalcCompleta : baseDeCalcSimplificada
  );

  // Calculate final tax amount after withholding
  const impostoDevido = {
    completo: impostoDevidoCompleto,
    simplificado: impostoDevidoSimplificado,
  };
  
  const saldoImposto = (data.tipoDeclaracao === 'completa' ? 
    impostoDevidoCompleto : impostoDevidoSimplificado) - data.impostoRetidoFonte;

  // Determine saldo type
  let tipoSaldo: 'pagar' | 'restituir' | 'zero' = 'zero';
  if (saldoImposto > 0) tipoSaldo = 'pagar';
  else if (saldoImposto < 0) tipoSaldo = 'restituir';

  // Detailed deductions
  const valorDeducaoDependentes = data.numeroDependentes * TAX_CONSTANTS.DEDUCAO_POR_DEPENDENTE;
  
  const detalhamentoDeducoes = {
    dependentes: valorDeducaoDependentes,
    previdencia: data.contribuicaoPrevidenciaria,
    saude: data.despesasMedicas,
    educacao: Math.min(data.despesasEducacao, 
      getLimiteEducacao(data.numeroDependentes)),
    pensao: data.pensaoAlimenticia,
    livroCaixa: data.livroCaixa,
    total: calculateDeductions(data),
  };
  
  return {
    baseDeCalculo: {
      completa: baseDeCalcCompleta,
      simplificada: baseDeCalcSimplificada,
    },
    descontoSimplificado,
    descontoCompleto: detalhamentoDeducoes.total,
    impostoDevido,
    declaracaoRecomendada,
    saldoImposto,
    tipoSaldo,
    impostoFaixas,
    detalhamentoDeducoes,
    impostoRetidoFonte: data.impostoRetidoFonte,
  };
};
