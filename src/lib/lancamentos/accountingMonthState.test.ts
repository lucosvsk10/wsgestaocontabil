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
    expect(hasModuleError({ validationIssues: ["competência incorreta"] })).toBe(true);
    expect(hasModuleError({ issues: ["linha inválida"] })).toBe(true);
    expect(hasModuleError({ warnings: [] })).toBe(false);
  });
});
