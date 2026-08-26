export type SaleData = Record<string, unknown>;

const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const esc = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");
const n2 = (value: unknown) => Number(value || 0).toFixed(2);
const HOMOLOGATION_ITEM_DESCRIPTION = "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";

function dvModulo11(base: string) {
  let weight = 2;
  let sum = 0;
  for (let i = base.length - 1; i >= 0; i--) {
    sum += Number(base[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const mod = 11 - (sum % 11);
  return mod === 10 || mod === 11 ? 0 : mod;
}

function nowBrazilIso() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const local = new Date(utc - 3 * 3600000);
  const yyyy = local.getUTCFullYear();
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(local.getUTCDate()).padStart(2, "0");
  const hh = String(local.getUTCHours()).padStart(2, "0");
  const mi = String(local.getUTCMinutes()).padStart(2, "0");
  const ss = String(local.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}-03:00`;
}

function keyParts(raw: SaleData, model: "55" | "65") {
  const dhEmi = nowBrazilIso();
  const aamm = dhEmi.slice(2, 4) + dhEmi.slice(5, 7);
  const cUF = "27";
  const cnpj = digits(raw.cnpjEmitente).padStart(14, "0");
  const serie = digits(raw.serie || "1").padStart(3, "0").slice(-3);
  const nNF = digits(raw.numeroNota || "1").padStart(9, "0").slice(-9);
  const tpEmis = "1";
  const cNF = String(Math.floor(Math.random() * 100000000)).padStart(8, "0");
  const base = `${cUF}${aamm}${cnpj}${model}${serie}${nNF}${tpEmis}${cNF}`;
  const cDV = String(dvModulo11(base));
  return { dhEmi, cUF, cnpj, serie, nNF, tpEmis, cNF, cDV, chave: base + cDV };
}

export function buildNativeNfeXml(model: "55" | "65", raw: SaleData) {
  const qty = Number(raw.quantidade || 0);
  const unit = Number(raw.valorUnitario || 0);
  const total = qty * unit;
  const k = keyParts(raw, model);
  const crt = String(raw.crt || "1");
  const csosn = String(raw.csosn || "400");
  const cst = String(raw.cst || "00");
  const ie = digits(raw.ie);
  const cMun = digits(raw.codigoMunicipio);
  const cep = digits(raw.cep);
  const cfop = digits(raw.cfop);
  const ncm = digits(raw.ncm);
  const destDoc = digits(raw.destDocumento);
  const xProd = HOMOLOGATION_ITEM_DESCRIPTION;
  const taxXml = crt === "1"
    ? `<ICMS><ICMSSN102><orig>${esc(raw.origem || "0")}</orig><CSOSN>${esc(csosn)}</CSOSN></ICMSSN102></ICMS>`
    : `<ICMS><ICMS00><orig>${esc(raw.origem || "0")}</orig><CST>${esc(cst)}</CST><modBC>3</modBC><vBC>0.00</vBC><pICMS>0.00</pICMS><vICMS>0.00</vICMS></ICMS00></ICMS>`;

  const destXml = destDoc
    ? `<dest>${destDoc.length === 14 ? `<CNPJ>${destDoc}</CNPJ>` : `<CPF>${destDoc}</CPF>`}<xNome>${esc(raw.destNome || "CONSUMIDOR")}</xNome><indIEDest>9</indIEDest>${model === "55" ? `<enderDest><xLgr>${esc(raw.destLogradouro || "RUA TESTE")}</xLgr><nro>${esc(raw.destNumero || "1")}</nro><xBairro>${esc(raw.destBairro || "CENTRO")}</xBairro><cMun>${digits(raw.destCodigoMunicipio || raw.codigoMunicipio)}</cMun><xMun>${esc(raw.destMunicipio || raw.nomeMunicipio)}</xMun><UF>${esc(raw.destUF || "AL")}</UF><CEP>${digits(raw.destCep || raw.cep)}</CEP><cPais>1058</cPais><xPais>BRASIL</xPais></enderDest>` : ""}</dest>`
    : "";

  const xml = `<?xml version="1.0" encoding="UTF-8"?><NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe${k.chave}" versao="4.00"><ide><cUF>${k.cUF}</cUF><cNF>${k.cNF}</cNF><natOp>VENDA</natOp><mod>${model}</mod><serie>${Number(k.serie)}</serie><nNF>${Number(k.nNF)}</nNF><dhEmi>${k.dhEmi}</dhEmi><tpNF>1</tpNF><idDest>1</idDest><cMunFG>${cMun}</cMunFG><tpImp>${model === "65" ? "4" : "1"}</tpImp><tpEmis>${k.tpEmis}</tpEmis><cDV>${k.cDV}</cDV><tpAmb>2</tpAmb><finNFe>1</finNFe><indFinal>1</indFinal><indPres>1</indPres><procEmi>0</procEmi><verProc>WS-FEATURE-1.3</verProc></ide><emit><CNPJ>${k.cnpj}</CNPJ><xNome>${esc(raw.razaoSocial)}</xNome><xFant>${esc(raw.nomeFantasia || raw.razaoSocial)}</xFant><enderEmit><xLgr>${esc(raw.logradouro)}</xLgr><nro>${esc(raw.numeroEndereco)}</nro>${raw.complemento ? `<xCpl>${esc(raw.complemento)}</xCpl>` : ""}<xBairro>${esc(raw.bairro)}</xBairro><cMun>${cMun}</cMun><xMun>${esc(raw.nomeMunicipio)}</xMun><UF>AL</UF><CEP>${cep}</CEP><cPais>1058</cPais><xPais>BRASIL</xPais>${digits(raw.telefone) ? `<fone>${digits(raw.telefone)}</fone>` : ""}</enderEmit><IE>${ie}</IE><CRT>${esc(crt)}</CRT></emit>${destXml}<det nItem="1"><prod><cProd>${esc(raw.codigoProduto || "1")}</cProd><cEAN>SEM GTIN</cEAN><xProd>${esc(xProd)}</xProd><NCM>${ncm}</NCM><CFOP>${cfop}</CFOP><uCom>${esc(raw.unidade || "UN")}</uCom><qCom>${qty.toFixed(4)}</qCom><vUnCom>${unit.toFixed(10)}</vUnCom><vProd>${n2(total)}</vProd><cEANTrib>SEM GTIN</cEANTrib><uTrib>${esc(raw.unidade || "UN")}</uTrib><qTrib>${qty.toFixed(4)}</qTrib><vUnTrib>${unit.toFixed(10)}</vUnTrib><indTot>1</indTot></prod><imposto>${taxXml}<PIS><PISOutr><CST>49</CST><vBC>0.00</vBC><pPIS>0.00</pPIS><vPIS>0.00</vPIS></PISOutr></PIS><COFINS><COFINSOutr><CST>49</CST><vBC>0.00</vBC><pCOFINS>0.00</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSOutr></COFINS></imposto></det><total><ICMSTot><vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson><vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST><vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet><vProd>${n2(total)}</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc><vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro><vNF>${n2(total)}</vNF></ICMSTot></total><transp><modFrete>9</modFrete></transp><pag><detPag><indPag>0</indPag><tPag>${esc(raw.formaPagamento || "17")}</tPag><vPag>${n2(total)}</vPag></detPag></pag></infNFe></NFe>`;

  return { xml, chaveAcesso: k.chave, total, signed: false };
}
