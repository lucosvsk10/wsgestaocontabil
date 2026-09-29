import { describe, expect, it } from "vitest";
import { findFiscalXml, isXmlRetryDue, xmlRetryDelayMs } from "./xml-recovery";

describe("XML recovery", () => {
  it("keeps old failures eligible instead of abandoning them after eight attempts", () => {
    const now = Date.parse("2026-09-28T15:00:00.000Z");
    expect(isXmlRetryDue({ xml_attempts: 12, xml_last_checked_at: "2026-09-28T08:59:59.000Z" }, now)).toBe(true);
    expect(isXmlRetryDue({ xml_attempts: 12, xml_last_checked_at: "2026-09-28T12:00:01.000Z" }, now)).toBe(false);
    expect(xmlRetryDelayMs(12)).toBe(6 * 60 * 60_000);
  });

  it("extracts a complete XML from nested gateway payloads", () => {
    const xml = `<nfeProc>${"x".repeat(1100)}</nfeProc>`;
    expect(findFiscalXml({ data: { result: { documentoXml: xml } } })).toBe(xml);
    expect(findFiscalXml(JSON.stringify({ payload: { XML: xml } }))).toBe(xml);
  });
});
