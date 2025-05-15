
export interface TaxFormInput {
  rendimentosTributaveis: number;
  rendimentosIsentos: number;
  contribuicaoPrevidenciaria: number;
  despesasMedicas: number;
  despesasEducacao: number;
  pensaoAlimenticia: number;
  livroCaixa: number;
  numeroDependentes: number;
  impostoRetidoFonte: number;
  ehAposentado65: boolean;
  tipoDeclaracao: "completa" | "simplificada";
  previdenciaPrivada?: number;
  nome?: string;
  email?: string;
  telefone?: string;
  user?: any;
}

export interface TaxResult {
  baseDeCalculo: {
    completa: number;
    simplificada: number;
  };
  descontoSimplificado: number;
  descontoCompleto: number;
  impostoDevido: {
    completo: number;
    simplificado: number;
  };
  declaracaoRecomendada: 'completa' | 'simplificada';
  saldoImposto: number;
  tipoSaldo: 'pagar' | 'restituir' | 'zero';
  impostoFaixas: {
    faixa: number;
    valorImposto: number;
    baseCalculo: number;
    aliquota: number;
  }[];
  detalhamentoDeducoes: {
    dependentes: number;
    previdencia: number;
    saude: number;
    educacao: number;
    pensao: number;
    livroCaixa: number;
    total: number;
  };
  impostoRetidoFonte: number;
}

export interface TaxBracket {
  faixa: number;
  baseCalculo: number;
  aliquota: number;
  valorImposto: number;
}

export type TaxFormValues = TaxFormInput;
