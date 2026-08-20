const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const formatCompetencia = (competencia: string) => {
  const [year, month] = competencia.split('-');
  return `${MONTH_NAMES[Number(month) - 1]} de ${year}`;
};
