import { describe, expect, it } from "vitest";
import { hasModuleActivity, hasModuleError, resolveDynamicStatus } from "./accountingMonthState";

describe("accounting month dynamic status", () => {
  it("does not keep a stale done status after the real data is deleted", () => {
    expect(resolveDynamicStatus(false, false, true)).toBe("waiting");
  });

  it("uses review when a real document or parsed payload exists but was not confirmed", () => {
    expect(resolveDynamicStatus(true, false, false)).toBe("review");
  });

  it("uses done only when there is real activity, no errors and a current confirmation", () => {
    expect(resolveDynamicStatus(true, false, true)).toBe("done");
  });

  it("uses error instead of done when the current payload has blocking problems", () => {
    expect(resolveDynamicStatus(true, true, true)).toBe("error");
  });

  it("recognizes module activity from current parsed payloads", () => {
    expect(hasModuleActivity("despesas", { entries: [{ id: "1" }], issues: [] })).toBe(true);
    expect(hasModuleActivity("folha", { entries: [], documentTotals: [{ amount: 1 }] })).toBe(true);
    expect(hasModuleActivity("compras", { reference: { quantity: 1 } })).toBe(true);
    expect(hasModuleActivity("faturamento", { entries: [{ id: "1" }] })).toBe(true);
    expect(hasModuleActivity("despesas", { entries: [], issues: [] })).toBe(false);
  });

  it("recognizes current import/validation errors", () => {
    expect(hasModuleError("folha", { validationIssues: ["competência incorreta"] })).toBe(true);
    expect(hasModuleError("despesas", { issues: ["linha inválida"] })).toBe(true);
    expect(hasModuleError("faturamento", { warnings: [] })).toBe(false);
  });

  it("does not turn a confirmed payroll month red for informational internal-PDF mismatches", () => {
    expect(hasModuleError("folha", {
      validationIssues: ["O próprio documento não fecha: Total de Proventos - Total de Descontos difere do Líquido."],
      warnings: [],
    })).toBe(false);
    expect(hasModuleError("folha", {
      validationIssues: ["Líquido: diferença de 2885.38."],
      warnings: [],
    })).toBe(false);
  });

  it("keeps real payroll processing problems blocking", () => {
    expect(hasModuleError("folha", { warnings: ["rubrica não identificada"] })).toBe(true);
    expect(hasModuleError("folha", { validationIssues: ["conta obrigatória ausente"] })).toBe(true);
  });
});
