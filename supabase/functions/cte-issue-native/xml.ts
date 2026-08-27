const esc = (v: unknown) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const money = (v: unknown) => Number(v || 0).toFixed(2);

function mod11(base: string) {
  let weight = 2, sum = 0;
  for (let i = base.length - 1; i >= 0; i--) {
    sum += Number(base[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const mod = 11 - (sum % 11);
  return mod === 10 || mod === 11 ? 0 : mod;
}

export function buildCteXml(raw: Record<string, any>, issuerCnpj: string) {
  const cUF = digits(raw.cUF || "27").padStart(2, "0");
  const dhEmi = String(raw.dhEmi || new Date().toISOString()).replace(/Z$/, "-03:00");
  const aamm = dhEmi.slice(2, 4) + dhEmi.slice(5, 7);
  const mod = "57";
  const serie = digits(raw.serie || "1").padStart(3, "0").slice(-3);
  const nCT = digits(raw.numero || "1").padStart(9, "0").slice(-9);
  const tpEmis = digits(raw.tpEmis || "1");
  const cCT = digits(raw.cCT || String(Date.now()).slice(-8)).padStart(8, "0").slice(-8);
  const baseKey = `${cUF}${aamm}${issuerCnpj}${mod}${serie}${nCT}${tpEmis}${cCT}`;
  const cDV = String(mod11(baseKey));
  const chave = baseKey + cDV;
  const id = `CTe${chave}`;

  const emit = raw.emit || {};
  const rem = raw.rem || {};
  const dest = raw.dest || {};
  const carga = raw.carga || {};
  const rod = raw.rodo || {};
  const chNFe = digits(raw.chNFe);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>` +
  `<CTe xmlns="http://www.portalfiscal.inf.br/cte"><infCte versao="4.00" Id="${id}">` +
  `<ide><cUF>${cUF}</cUF><cCT>${cCT}</cCT><CFOP>${esc(raw.cfop || "5353")}</CFOP><natOp>${esc(raw.natOp || "PRESTACAO DE SERVICO DE TRANSPORTE")}</natOp><mod>57</mod><serie>${Number(serie)}</serie><nCT>${Number(nCT)}</nCT><dhEmi>${esc(dhEmi)}</dhEmi><tpImp>1</tpImp><tpEmis>${tpEmis}</tpEmis><cDV>${cDV}</cDV><tpAmb>2</tpAmb><tpCTe>0</tpCTe><procEmi>0</procEmi><verProc>WS-CTE-1.0</verProc><cMunEnv>${digits(emit.cMun)}</cMunEnv><xMunEnv>${esc(emit.xMun)}</xMunEnv><UFEnv>${esc(emit.UF)}</UFEnv><modal>01</modal><tpServ>0</tpServ><cMunIni>${digits(raw.cMunIni)}</cMunIni><xMunIni>${esc(raw.xMunIni)}</xMunIni><UFIni>${esc(raw.UFIni)}</UFIni><cMunFim>${digits(raw.cMunFim)}</cMunFim><xMunFim>${esc(raw.xMunFim)}</xMunFim><UFFim>${esc(raw.UFFim)}</UFFim><retira>1</retira></ide>` +
  `<emit><CNPJ>${issuerCnpj}</CNPJ><IE>${digits(emit.IE)}</IE><xNome>${esc(emit.xNome)}</xNome><enderEmit><xLgr>${esc(emit.xLgr)}</xLgr><nro>${esc(emit.nro)}</nro><xBairro>${esc(emit.xBairro)}</xBairro><cMun>${digits(emit.cMun)}</cMun><xMun>${esc(emit.xMun)}</xMun><CEP>${digits(emit.CEP)}</CEP><UF>${esc(emit.UF)}</UF></enderEmit><CRT>${esc(emit.CRT || "1")}</CRT></emit>` +
  `<rem><CNPJ>${digits(rem.CNPJ)}</CNPJ><IE>${digits(rem.IE)}</IE><xNome>${esc(rem.xNome)}</xNome><enderReme><xLgr>${esc(rem.xLgr)}</xLgr><nro>${esc(rem.nro)}</nro><xBairro>${esc(rem.xBairro)}</xBairro><cMun>${digits(rem.cMun)}</cMun><xMun>${esc(rem.xMun)}</xMun><CEP>${digits(rem.CEP)}</CEP><UF>${esc(rem.UF)}</UF></enderReme></rem>` +
  `<dest><CNPJ>${digits(dest.CNPJ)}</CNPJ><IE>${digits(dest.IE)}</IE><xNome>${esc(dest.xNome)}</xNome><enderDest><xLgr>${esc(dest.xLgr)}</xLgr><nro>${esc(dest.nro)}</nro><xBairro>${esc(dest.xBairro)}</xBairro><cMun>${digits(dest.cMun)}</cMun><xMun>${esc(dest.xMun)}</xMun><CEP>${digits(dest.CEP)}</CEP><UF>${esc(dest.UF)}</UF></enderDest></dest>` +
  `<vPrest><vTPrest>${money(raw.vTPrest)}</vTPrest><vRec>${money(raw.vRec ?? raw.vTPrest)}</vRec></vPrest>` +
  `<imp><ICMS><ICMSSN><CST>90</CST><indSN>1</indSN></ICMSSN></ICMS></imp>` +
  `<infCTeNorm><infCarga><vCarga>${money(carga.vCarga)}</vCarga><proPred>${esc(carga.proPred || "CARGA GERAL")}</proPred><infQ><cUnid>01</cUnid><tpMed>PESO BRUTO</tpMed><qCarga>${Number(carga.qCarga || 1).toFixed(4)}</qCarga></infQ></infCarga>` +
  `<infDoc>${chNFe ? `<infNFe><chave>${chNFe}</chave></infNFe>` : ""}</infDoc>` +
  `<infModal versaoModal="4.00"><rodo><RNTRC>${digits(rod.RNTRC)}</RNTRC></rodo></infModal></infCTeNorm>` +
  `</infCte></CTe>`;

  return { xml, chave, id, cDV };
}

export function validateCteInput(raw: Record<string, any>, issuerCnpj: string) {
  const errors: string[] = [];
  if (issuerCnpj.length !== 14) errors.push("Certificado sem CNPJ válido.");
  for (const [label, value, len] of [
    ["IE do emitente", raw.emit?.IE, 8], ["Município do emitente", raw.emit?.cMun, 7], ["Município inicial", raw.cMunIni, 7], ["Município final", raw.cMunFim, 7]
  ] as Array<[string, unknown, number]>) {
    if (digits(value).length < len) errors.push(`${label} inválido.`);
  }
  if (!String(raw.emit?.xNome || "").trim()) errors.push("Razão social do emitente obrigatória.");
  if (!String(raw.rem?.xNome || "").trim()) errors.push("Remetente obrigatório.");
  if (!String(raw.dest?.xNome || "").trim()) errors.push("Destinatário obrigatório.");
  if (!(Number(raw.vTPrest) > 0)) errors.push("Valor da prestação deve ser maior que zero.");
  if (!(Number(raw.carga?.vCarga) > 0)) errors.push("Valor da carga deve ser maior que zero.");
  if (!digits(raw.rodo?.RNTRC)) errors.push("RNTRC obrigatório para modal rodoviário.");
  if (raw.chNFe && digits(raw.chNFe).length !== 44) errors.push("Chave da NF-e deve ter 44 dígitos.");
  return { valid: errors.length === 0, errors };
}
