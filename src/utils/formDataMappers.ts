
import { TaxSimulation, TaxFormSubmission } from "@/types/taxSimulation";

// Mapeia do formato do formulário para o formato aceito pelo Supabase
export function mapTaxFormToSupabase(formData: any): any {
  return {
    user_id: formData.user_id || null,
    nome: formData.nome || null,
    email: formData.email || null,
    telefone: formData.telefone || null,
    rendimento_bruto: formData.rendimentos_tributaveis || 0,
    inss: formData.contribuicao_previdenciaria || 0,
    educacao: formData.despesas_educacao || 0,
    saude: formData.despesas_medicas || 0,
    dependentes: formData.numeroDependentes || 0,
    outras_deducoes: (formData.outras_deducoes || 0) + (formData.pensao_alimenticia || 0) + (formData.livro_caixa || 0),
    imposto_estimado: formData.impostoDevido || 0,
    tipo_simulacao: formData.tipoDeclaracaoRecomendada || formData.tipoDeclaracao || 'completa',
    observacoes: formData.observacoes || null,
    data_criacao: new Date().toISOString()
  };
}

// Mapeia do formato do Supabase para o formato aceito pelo formulário
export function mapSupabaseToTaxForm(dbData: TaxSimulation): any {
  return {
    user_id: dbData.user_id || null,
    nome: dbData.nome || null,
    email: dbData.email || null,
    telefone: dbData.telefone || null,
    rendimentos_tributaveis: dbData.rendimento_bruto || 0,
    rendimentos_isentos: dbData.rendimentos_isentos || 0,
    contribuicao_previdenciaria: dbData.inss || 0,
    despesas_educacao: dbData.educacao || 0,
    despesas_medicas: dbData.saude || 0,
    numeroDependentes: dbData.dependentes || 0,
    outras_deducoes: dbData.outras_deducoes || 0,
    impostoDevido: dbData.imposto_estimado || 0,
    tipo_simulacao: dbData.tipo_simulacao || 'completa',
    observacoes: dbData.observacoes || null,
    data_criacao: dbData.data_criacao || new Date().toISOString()
  };
}
