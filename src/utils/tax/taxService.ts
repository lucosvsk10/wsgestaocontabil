
import { TAX_CONSTANTS } from './constants';
import { TaxFormInput, TaxResult } from './types';
import { calculateTaxBrackets, calculateTaxByBrackets, getLimiteEducacao } from './calculations';

/**
 * Calcula o resultado completo do imposto de renda com todas as regras aplicáveis
 */
export const calculateFullTaxResult = (formData: TaxFormInput): TaxResult => {
  // Calcular deduções para modelo completo
  const deducaoDependentes = formData.numeroDependentes * TAX_CONSTANTS.DEDUCAO_POR_DEPENDENTE;
  const deducaoEducacaoLimitada = Math.min(formData.despesasEducacao, getLimiteEducacao(formData.numeroDependentes));
  
  // Calcular total de deduções no modelo completo
  const totalDeducoesCompleto = 
    formData.contribuicaoPrevidenciaria + 
    formData.despesasMedicas + 
    deducaoEducacaoLimitada + 
    formData.pensaoAlimenticia + 
    formData.livroCaixa +
    deducaoDependentes;
  
  // Aplicar isenção para aposentados acima de 65 anos
  let rendimentosTributaveisAjustados = formData.rendimentosTributaveis;
  if (formData.ehAposentado65) {
    rendimentosTributaveisAjustados = Math.max(0, formData.rendimentosTributaveis - TAX_CONSTANTS.ISENCAO_APOSENTADOS_65);
  }
  
  // Base de cálculo para modelo completo
  const baseCalculoCompleta = Math.max(0, rendimentosTributaveisAjustados - totalDeducoesCompleto);
  
  // Cálculo do desconto simplificado (20% limitado ao teto)
  const descontoSimplificadoCalculado = Math.min(
    rendimentosTributaveisAjustados * TAX_CONSTANTS.DESCONTO_SIMPLIFICADO_PERCENTUAL, 
    TAX_CONSTANTS.DESCONTO_SIMPLIFICADO_TETO
  );
  
  // Base de cálculo para modelo simplificado
  const baseCalculoSimplificada = Math.max(0, rendimentosTributaveisAjustados - descontoSimplificadoCalculado);
  
  // Cálculo do imposto devido em ambos os modelos
  const impostoDevidoCompleto = calculateTaxBrackets(baseCalculoCompleta);
  const impostoDevidoSimplificado = calculateTaxBrackets(baseCalculoSimplificada);
  
  // Determinar qual modelo é mais vantajoso
  const declaracaoRecomendada = impostoDevidoCompleto <= impostoDevidoSimplificado ? 'completa' : 'simplificada';
  
  // Imposto final de acordo com o modelo escolhido pelo usuário
  const impostoFinal = formData.tipoDeclaracao === 'completa' ? impostoDevidoCompleto : impostoDevidoSimplificado;
  
  // Saldo do imposto (a pagar ou a restituir)
  const saldoImposto = impostoFinal - formData.impostoRetidoFonte;
  
  // Determinar se é a pagar ou a restituir
  let tipoSaldo: 'pagar' | 'restituir' | 'zero' = 'zero';
  if (saldoImposto > 0) {
    tipoSaldo = 'pagar';
  } else if (saldoImposto < 0) {
    tipoSaldo = 'restituir';
  }

  // Calcular detalhamento por faixas para o modelo escolhido
  const baseCalculoFinal = formData.tipoDeclaracao === 'completa' ? baseCalculoCompleta : baseCalculoSimplificada;
  const impostoFaixas = calculateTaxByBrackets(baseCalculoFinal);
  
  return {
    baseDeCalculo: {
      completa: baseCalculoCompleta,
      simplificada: baseCalculoSimplificada
    },
    descontoSimplificado: descontoSimplificadoCalculado,
    descontoCompleto: totalDeducoesCompleto,
    impostoDevido: {
      completo: impostoDevidoCompleto,
      simplificado: impostoDevidoSimplificado
    },
    declaracaoRecomendada,
    saldoImposto: Math.abs(saldoImposto),
    tipoSaldo,
    impostoFaixas,
    detalhamentoDeducoes: {
      dependentes: deducaoDependentes,
      previdencia: formData.contribuicaoPrevidenciaria,
      saude: formData.despesasMedicas,
      educacao: deducaoEducacaoLimitada,
      pensao: formData.pensaoAlimenticia,
      livroCaixa: formData.livroCaixa,
      total: totalDeducoesCompleto
    },
    impostoRetidoFonte: formData.impostoRetidoFonte
  };
};
