
export interface TaxSimulation {
  id: string;
  user_id: string | null;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  rendimento_bruto: number;
  inss: number;
  dependentes: number | null;
  educacao: number | null;
  saude: number | null;
  outras_deducoes: number | null;
  imposto_estimado: number;
  tipo_simulacao: string;
  data_criacao: string;
  observacoes: string | null;
}
