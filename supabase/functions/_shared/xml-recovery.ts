export type XmlRetryRow = {
  xml_attempts?: number | null;
  xml_last_checked_at?: string | null;
};

export function xmlRetryDelayMs(attempts: number): number {
  if (attempts <= 2) return 2 * 60_000;
  if (attempts <= 5) return 10 * 60_000;
  if (attempts <= 8) return 30 * 60_000;
  return 6 * 60 * 60_000;
}

export function isXmlRetryDue(row: XmlRetryRow, now = Date.now()): boolean {
  const checkedAt = Date.parse(String(row.xml_last_checked_at || ""));
  if (!Number.isFinite(checkedAt)) return true;
  return now - checkedAt >= xmlRetryDelayMs(Math.max(0, Number(row.xml_attempts || 0)));
}

export function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

export function validFiscalXml(value: unknown): string {
  const xml = decodeXmlEntities(String(value ?? "")).trim();
  return /<(?:\w+:)?(?:nfeProc|procNFe|NFe)\b/i.test(xml) && xml.length > 1000 ? xml : "";
}

export function findFiscalXml(value: unknown, depth = 0): string {
  if (depth > 6 || value == null) return "";
  const direct = validFiscalXml(value);
  if (direct) return direct;
  if (typeof value === "string") {
    try {
      return findFiscalXml(JSON.parse(value), depth + 1);
    } catch {
      const embedded = value.match(/(?:"xml"|"Xml"|"XML"|"conteudoXml"|"documentoXml")\s*:\s*"((?:\\.|[^"\\])*)"/i);
      if (!embedded?.[1]) return "";
      try {
        return validFiscalXml(JSON.parse(`"${embedded[1]}"`));
      } catch {
        return "";
      }
    }
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const xml = findFiscalXml(item, depth + 1);
      if (xml) return xml;
    }
    return "";
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred = ["xml", "Xml", "XML", "conteudoXml", "documentoXml", "body", "body_text", "data", "result", "payload"];
    for (const key of preferred) {
      if (!(key in record)) continue;
      const xml = findFiscalXml(record[key], depth + 1);
      if (xml) return xml;
    }
    for (const nested of Object.values(record)) {
      const xml = findFiscalXml(nested, depth + 1);
      if (xml) return xml;
    }
  }
  return "";
}
