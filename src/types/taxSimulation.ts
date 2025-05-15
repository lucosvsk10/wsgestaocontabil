export interface TaxSimulation {
  id: string;
  user_id?: string;
  nome?: string;
  email?: string;
  telefone?: string;
  rendimento_bruto: number;
  inss: number;
  educacao?: number;
  saude?: number;
  dependentes?: number;
  outras_deducoes?: number;
  imposto_estimado: number;
  tipo_simulacao: string;
  data_criacao?: string;
  observacoes?: string;
}
