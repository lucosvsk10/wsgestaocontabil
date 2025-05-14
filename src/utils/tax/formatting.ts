
/**
 * Formata um valor para o formato de moeda brasileira (R$)
 */
export const currencyFormat = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};
