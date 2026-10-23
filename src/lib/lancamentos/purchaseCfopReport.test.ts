import { describe, expect, it } from "vitest";
import { parseCfopPurchaseReportText } from "./purchaseCfopReport";

const sample = `
Página: 1
Ref: 01/01/2026 a 31/01/2026
Empresa: 23
Registro de Entradas Por CFOP
BATISTA E SILVA LTDA
CFOP 1102 - Compra para comercialização
Vr. Total 15.725,91 Acres. 0,00
Vr. Contábil 15.222,16 Desc. 503,75
Subtotal
1403 - Compra para comercialização em operação com mercadoria sujeita ao regime de
substituição tributária
CFOP
Vr. Total 18.914,13 Acres. 0,00
Vr. Contábil 18.816,61 Desc. 678,53
Subtotal
Vr. Total 34.640,04
Vr. Contábil 34.038,77
Total Líquido
Total Geral
`;

describe("parseCfopPurchaseReportText", () => {
  it("transcreve CFOPs e usa Vr. Contábil sem IA", () => {
    const result = parseCfopPurchaseReportText(sample);
    expect(result).not.toBeNull();
    expect(result?.reference.competence).toBe("01/2026");
    expect(result?.reference.totalAmountInCents).toBe(3403877);
    expect(result?.items).toHaveLength(2);
    expect(result?.items[0]).toMatchObject({
      cfop: "1102",
      amountInCents: 1522216,
      rowType: "cfop_summary",
      classification: "comercialização",
    });
    expect(result?.items[1].cfop).toBe("1403");
    expect(result?.items[1].amountInCents).toBe(1881661);
    expect(result?.comparisons[0].difference).toBe(0);
    expect(result?.referenceVerified).toBe(true);
    expect(result?.processingMeta.model).toBe("deterministic-cfop-parser");
  });

  it("ignora PDFs que não são Registro de Entradas Por CFOP", () => {
    expect(parseCfopPurchaseReportText("Outro relatório qualquer")).toBeNull();
  });
});
