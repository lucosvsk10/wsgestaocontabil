
import { TAX_CONSTANTS } from './constants';
import { TaxBracket } from './types';

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
export const calculateTaxByBrackets = (baseCalculo: number): TaxBracket[] => {
  const mensal = baseCalculo / 12;
  const faixasImposto: TaxBracket[] = [];
  
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
