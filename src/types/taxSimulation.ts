
export interface TaxSimulation {
  id: string;
  user_id: string | null;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  tipo_simulacao: string;
  rendimento_bruto: number;
  inss: number;
  educacao: number | null;
  saude: number | null;
  dependentes: number | null;
  outras_deducoes: number | null;
  imposto_estimado: number;
  data_criacao: string | null;
  observacoes?: string;
  
  // Novos campos
  rendimentos_tributaveis?: number;
  rendimentos_isentos?: number;
  contribuicao_previdenciaria?: number;
  despesas_medicas?: number;
  despesas_educacao?: number;
  pensao_alimenticia?: number;
  livro_caixa?: number;
  previdencia_privada?: number;
  data_simulacao?: Date;
}

export interface TaxFormSubmission {
  user_id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  rendimento_bruto: number;
  inss: number;
  educacao: number;
  saude: number;
  dependentes: number;
  outras_deducoes: number;
  tipo_simulacao: string;
  imposto_estimado: number;
  observacoes?: string;
  
  // Campos novos
  rendimentos_tributaveis: number;
  rendimentos_isentos: number;
  contribuicao_previdenciaria: number;
  despesas_medicas: number;
  despesas_educacao: number;
  pensao_alimenticia: number;
  livro_caixa: number;
  previdencia_privada?: number;
  data_simulacao: Date;
}

// Mapeamento para transformar o objeto de submissão para o formato aceito pelo Supabase
export function mapToSupabaseFormat(formData: TaxFormSubmission): any {
  return {
    user_id: formData.user_id,
    nome: formData.nome,
    email: formData.email,
    telefone: formData.telefone,
    rendimento_bruto: formData.rendimentos_tributaveis,
    inss: formData.contribuicao_previdenciaria,
    educacao: formData.despesas_educacao,
    saude: formData.despesas_medicas,
    dependentes: formData.dependentes,
    outras_deducoes: formData.outras_deducoes + (formData.pensao_alimenticia || 0) + (formData.livro_caixa || 0),
    tipo_simulacao: formData.tipo_simulacao,
    imposto_estimado: formData.imposto_estimado,
    observacoes: formData.observacoes,
    data_criacao: new Date().toISOString()
  };
}
