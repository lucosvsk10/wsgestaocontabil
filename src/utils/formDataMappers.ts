
import { TaxFormInput, TaxResult } from "@/utils/tax/types";
import { TaxSimulation } from "@/types/taxSimulation";

export const mapFormInputToApiData = (formData: TaxFormInput, result: TaxResult) => {
  return {
    nome: formData.nome || null,
    email: formData.email || null,
    telefone: formData.telefone || null,
    rendimento_bruto: formData.rendimentosTributaveis,
    rendimentos_isentos: formData.rendimentosIsentos,
    inss: formData.contribuicaoPrevidenciaria,
    educacao: formData.despesasEducacao,
    saude: formData.despesasMedicas,
    dependentes: formData.numeroDependentes,
    outras_deducoes: formData.pensaoAlimenticia + formData.livroCaixa,
    imposto_estimado: result.saldoImposto,
    tipo_simulacao: result.tipoSaldo === 'pagar' ? 'a pagar' : 'restituição',
    data_criacao: new Date().toISOString(),
    observacoes: ''
  };
};

export const getTaxSimulationFromApiData = (data: any): TaxSimulation => {
  return {
    id: data.id,
    user_id: data.user_id,
    nome: data.nome,
    email: data.email,
    telefone: data.telefone,
    rendimento_bruto: data.rendimento_bruto,
    inss: data.inss,
    dependentes: data.dependentes,
    educacao: data.educacao,
    saude: data.saude,
    outras_deducoes: data.outras_deducoes,
    imposto_estimado: data.imposto_estimado,
    tipo_simulacao: data.tipo_simulacao,
    data_criacao: data.data_criacao,
    observacoes: data.observacoes || null
  };
};
