import { describe, expect, it } from "vitest";
import { isManualOnlyConference } from "./manualOnlyConference";

describe("isManualOnlyConference", () => {
  it("libera somente quando existem lançamentos e todos são manuais", () => {
    expect(isManualOnlyConference([{ source: "manual" }, { source: "MANUAL" }])).toBe(true);
  });

  it("não libera lista vazia", () => {
    expect(isManualOnlyConference([])).toBe(false);
  });

  it("não libera quando uma única linha não é manual", () => {
    expect(isManualOnlyConference([{ source: "manual" }, { source: "ia" }])).toBe(false);
  });

  it("não libera origem ausente", () => {
    expect(isManualOnlyConference([{ source: "manual" }, {}])).toBe(false);
  });
});
