/**
 * Formata um valor para o formato de moeda brasileira (R$)
 */
export const currencyFormat = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

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

// Tipos para os dados do cálculo
export interface TaxFormInput {
  rendimentosTributaveis: number;
  rendimentosIsentos: number;
  contribuicaoPrevidenciaria: number;
  despesasMedicas: number;
  despesasEducacao: number;
  pensaoAlimenticia: number;
  livroCaixa: number;
  numeroDependentes: number;
  impostoRetidoFonte: number;
  ehAposentado65: boolean;
  tipoDeclaracao: "completa" | "simplificada";
  previdenciaPrivada?: number;
}

export interface TaxResult {
  baseDeCalculo: {
    completa: number;
    simplificada: number;
  };
  descontoSimplificado: number;
  descontoCompleto: number;
  impostoDevido: {
    completo: number;
    simplificado: number;
  };
  declaracaoRecomendada: 'completa' | 'simplificada';
  saldoImposto: number;
  tipoSaldo: 'pagar' | 'restituir' | 'zero';
  impostoFaixas: {
    faixa: number;
    valorImposto: number;
    baseCalculo: number;
    aliquota: number;
  }[];
  detalhamentoDeducoes: {
    dependentes: number;
    previdencia: number;
    saude: number;
    educacao: number;
    pensao: number;
    livroCaixa: number;
    total: number;
  };
  impostoRetidoFonte: number;
}

/**
 * Calcula o imposto de renda baseado nas faixas de tributação progressivas
 * Usando valores de 2024
 */
export const calculateTaxBrackets = (baseCalculo: number): number => {
  let imposto = 0;
  
  // Cálculo por mês conforme tabela progressiva
  const mensal = baseCalculo / 12;
  let impostoMensal = 0;
  
  // Encontra a faixa aplicável
  const faixa = TAX_CONSTANTS.FAIXAS_IRPF.find((f, i, faixas) => {
    // Se é a última faixa ou o valor está abaixo do limite da próxima faixa
    return i === faixas.length - 1 || mensal <= f.limite;
  });
  
  if (faixa && mensal > 0) {
    impostoMensal = (mensal * faixa.aliquota) - faixa.deducao;
  }
  
  // Imposto mensal não pode ser negativo
  impostoMensal = Math.max(0, impostoMensal);
  
  // Multiplicando por 12 para obter o valor anual
  imposto = impostoMensal * 12;
  
  return imposto;
};

/**
 * Calcula o imposto por faixas detalhadamente para visualização
 */
export const calculateTaxByBrackets = (baseCalculo: number) => {
  const mensal = baseCalculo / 12;
  const faixasImposto = [];
  
  // Calcula progressivamente por faixa
  for (let i = 0; i < TAX_CONSTANTS.FAIXAS_IRPF.length; i++) {
    const faixaAtual = TAX_CONSTANTS.FAIXAS_IRPF[i];
    const faixaAnterior = i > 0 ? TAX_CONSTANTS.FAIXAS_IRPF[i - 1] : { limite: 0, aliquota: 0 };
    
    // Valor que se encaixa nesta faixa
    let valorNaFaixa = 0;
    
    if (mensal > faixaAnterior.limite) {
      valorNaFaixa = Math.min(mensal, faixaAtual.limite) - faixaAnterior.limite;
      
      if (valorNaFaixa > 0 && faixaAtual.aliquota > 0) {
        faixasImposto.push({
          faixa: i + 1,
          baseCalculo: valorNaFaixa * 12,
          aliquota: faixaAtual.aliquota,
          valorImposto: valorNaFaixa * faixaAtual.aliquota * 12
        });
      }
    }
    
    // Se já processamos todo o valor, podemos parar
    if (mensal <= faixaAtual.limite) break;
  }
  
  return faixasImposto;
};

/**
 * Retorna o valor máximo de dedução para educação com base no número de dependentes
 */
export const getLimiteEducacao = (numeroDependentes: number): number => {
  // O limite é por pessoa (declarante + dependentes)
  return TAX_CONSTANTS.LIMITE_EDUCACAO * (numeroDependentes + 1);
};

/**
 * Calcula o resultado completo do imposto de renda com todas as regras aplicáveis
 */
export const calculateFullTaxResult = (formData: TaxFormInput) => {
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
