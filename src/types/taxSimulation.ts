
export interface TaxSimulation {
  id?: string;
  user_id?: string;
  nome?: string;
  email?: string;
  telefone?: string;
  data_criacao?: string;
  rendimento_bruto?: number;
  rendimentos_isentos?: number; // Added this field
  inss?: number;
  educacao?: number;
  saude?: number;
  dependentes?: number;
  outras_deducoes?: number;
  imposto_estimado?: number;
  tipo_simulacao?: string;
  observacoes?: string;
}

export interface TaxFormSubmission {
  // Define TaxFormSubmission since it's used in formDataMappers.ts
  user_id?: string;
  nome?: string;
  email?: string;
  telefone?: string;
  rendimentos_tributaveis?: number;
  rendimentos_isentos?: number;
  contribuicao_previdenciaria?: number;
  despesas_educacao?: number;
  despesas_medicas?: number;
  numeroDependentes?: number;
  outras_deducoes?: number;
  pensao_alimenticia?: number;
  livro_caixa?: number;
  impostoDevido?: number;
  tipoDeclaracao?: string;
  tipoDeclaracaoRecomendada?: string;
  observacoes?: string;
}
