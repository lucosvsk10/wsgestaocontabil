
import { z } from "zod";

// Schema for tax form validation
export const formSchema = z.object({
  rendimentosTributaveis: z.number().min(0, "Valor não pode ser negativo"),
  rendimentosIsentos: z.number().min(0, "Valor não pode ser negativo"),
  contribuicaoPrevidenciaria: z.number().min(0, "Valor não pode ser negativo"),
  despesasMedicas: z.number().min(0, "Valor não pode ser negativo"),
  despesasEducacao: z.number().min(0, "Valor não pode ser negativo"),
  pensaoAlimenticia: z.number().min(0, "Valor não pode ser negativo"),
  livroCaixa: z.number().min(0, "Valor não pode ser negativo"),
  numeroDependentes: z.number().int().min(0, "Valor não pode ser negativo"),
  impostoRetidoFonte: z.number().min(0, "Valor não pode ser negativo"),
  ehAposentado65: z.boolean().default(false),
  tipoDeclaracao: z.enum(["completa", "simplificada"]),
});

// Type from the schema
export type TaxFormValues = z.infer<typeof formSchema>;

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
