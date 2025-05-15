
/**
 * Formata um valor para o formato de moeda brasileira (R$)
 */
export const currencyFormat = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

/**
 * Calcula o imposto de renda baseado nas faixas de tributação progressivas
 * Usando valores de 2024
 */
export const calculateTaxBrackets = (baseCalculo: number): number => {
  let imposto = 0;
  
  // Faixas de tributação do IRPF (valores de 2024)
  // Até R$ 2.259,20 - Isento
  // De R$ 2.259,21 até R$ 2.826,65 - 7,5%
  // De R$ 2.826,66 até R$ 3.751,05 - 15%
  // De R$ 3.751,06 até R$ 4.664,68 - 22,5%
  // Acima de R$ 4.664,68 - 27,5%
  
  const mensal = baseCalculo / 12; // Convertendo para valor mensal para aplicar as faixas
  
  if (mensal <= 2259.20) {
    // Isento
    return 0;
  }
  
  // Calcula o imposto devido para cada faixa
  let impostoMensal = 0;
  
  if (mensal <= 2826.65) {
    impostoMensal = (mensal - 2259.20) * 0.075;
  } else if (mensal <= 3751.05) {
    impostoMensal = (2826.65 - 2259.20) * 0.075 + (mensal - 2826.65) * 0.15;
  } else if (mensal <= 4664.68) {
    impostoMensal = (2826.65 - 2259.20) * 0.075 + (3751.05 - 2826.65) * 0.15 + (mensal - 3751.05) * 0.225;
  } else {
    impostoMensal = (2826.65 - 2259.20) * 0.075 + (3751.05 - 2826.65) * 0.15 + (4664.68 - 3751.05) * 0.225 + (mensal - 4664.68) * 0.275;
  }
  
  // Multiplicando por 12 para obter o valor anual
  imposto = impostoMensal * 12;
  
  return imposto;
};
