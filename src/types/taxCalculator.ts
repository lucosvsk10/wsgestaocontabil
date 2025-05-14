
import { z } from "zod";
import { TaxFormInput, TaxResult } from "@/utils/tax/types";

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

// Re-export the types from our tax module
export { TaxFormInput, TaxResult };
