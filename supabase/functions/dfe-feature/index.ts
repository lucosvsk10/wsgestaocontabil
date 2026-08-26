import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import { Make, Tools } from "npm:node-sped-nfe@1.2.52";
import { lerCertificado } from "npm:nfse-node@0.3.2/certificado";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const encoder = new TextEncoder();
const toBase64Url = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};
const fromBase64Url = (value: string) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  return atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
};
async function verifyEngineToken(token: string, userId: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const secret = Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
  if (signature !== expected) return false;
  try {
    const decoded = JSON.parse(fromBase64Url(payload));
    return decoded.uid === userId && Number(decoded.exp) > Date.now();
  } catch { return false; }
}
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const money = (value: unknown) => Number(value || 0).toFixed(2);

function certificateFromBody(body: Record<string, unknown>) {
  const pfxBase64 = String(body.certificate_base64 || "").trim();
  const password = String(body.certificate_password || "");
  if (!pfxBase64) throw new Error("Selecione um certificado A1 (.pfx ou .p12).");
  if (!password) throw new Error("Informe a senha do certificado A1.");
  const pfx = Buffer.from(pfxBase64, "base64");
  const cert = lerCertificado(pfx, password);
  return { pfx, password, cert };
}
function certInfo(cert: ReturnType<typeof lerCertificado>) {
  return {
    cnpj: cert.titular.cnpj,
    cpf: cert.titular.cpf,
    nome: cert.titular.nome,
    validadeInicio: cert.validadeInicio.toISOString(),
    validadeFim: cert.validadeFim.toISOString(),
    validoAgora: cert.validadeInicio <= new Date() && cert.validadeFim >= new Date(),
  };
}

function validateSale(raw: Record<string, unknown>, model: "55" | "65") {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (digits(raw.cnpjEmitente).length !== 14) errors.push("Informe o CNPJ do emitente.");
  if (!String(raw.ie || "").trim()) errors.push("Informe a inscrição estadual.");
  if (!String(raw.razaoSocial || "").trim()) errors.push("Informe a razão social.");
  if (digits(raw.codigoMunicipio).length !== 7) errors.push("Código IBGE do município deve ter 7 dígitos.");
  if (!String(raw.logradouro || "").trim() || !String(raw.numeroEndereco || "").trim() || !String(raw.bairro || "").trim() || !String(raw.nomeMunicipio || "").trim() || digits(raw.cep).length !== 8) errors.push("Complete o endereço do emitente.");
  if (!String(raw.produto || "").trim()) errors.push("Informe o produto.");
  if (digits(raw.ncm).length !== 8) errors.push("NCM deve ter 8 dígitos.");
  if (digits(raw.cfop).length !== 4) errors.push("CFOP deve ter 4 dígitos.");
  if (!(Number(raw.quantidade) > 0)) errors.push("Quantidade deve ser maior que zero.");
  if (!(Number(raw.valorUnitario) > 0)) errors.push("Valor unitário deve ser maior que zero.");
  if (!String(raw.csosn || "").trim() && String(raw.crt || "1") === "1") errors.push("Informe o CSOSN.");
  if (model === "65" && (!String(raw.cscId || "").trim() || !String(raw.csc || "").trim())) warnings.push("CSC/ID CSC não informado. O teste de status funciona, mas a emissão NFC-e pode precisar deles conforme o leiaute aceito pela SEFAZ.");
  if (model === "55" && !digits(raw.destDocumento)) errors.push("NF-e modelo 55 exige destinatário identificado neste laboratório.");
  return { valid: errors.length === 0, errors, warnings };
}

function toolsFor(model: "55" | "65", raw: Record<string, unknown>, pfx: Buffer, password: string) {
  return new Tools({
    mod: model,
    tpAmb: 2,
    UF: "AL",
    versao: "4.00",
    CSC: String(raw.csc || ""),
    CSCid: String(raw.cscId || ""),
    timeout: 45,
  }, { pfx, senha: password });
}

function buildXml(model: "55" | "65", raw: Record<string, unknown>) {
  const validation = validateSale(raw, model);
  if (!validation.valid) {
    const error = new Error(validation.errors.join(" "));
    (error as any).validation = validation;
    throw error;
  }
  const nfe = new Make();
  const qty = Number(raw.quantidade);
  const unit = Number(raw.valorUnitario);
  const total = qty * unit;
  const numero = String(raw.numeroNota || "1");
  const serie = String(raw.serie || "1");
  const cNF = String(Math.floor(Math.random() * 100000000)).padStart(8, "0");

  nfe.tagInfNFe({ Id: null, versao: "4.00" });
  nfe.tagIde({
    cUF: "27", cNF, natOp: "VENDA", mod: model, serie, nNF: numero,
    dhEmi: nfe.formatData(), tpNF: "1", idDest: "1", cMunFG: digits(raw.codigoMunicipio),
    tpImp: model === "65" ? "4" : "1", tpEmis: "1", cDV: "0", tpAmb: "2", finNFe: "1",
    indFinal: "1", indPres: "1", indIntermed: "0", procEmi: "0", verProc: "WS-FEATURE-1.0",
  });
  nfe.tagEmit({
    CNPJ: digits(raw.cnpjEmitente), xNome: String(raw.razaoSocial), xFant: String(raw.nomeFantasia || raw.razaoSocial),
    IE: String(raw.ie), CRT: String(raw.crt || "1"),
  });
  nfe.tagEnderEmit({
    xLgr: String(raw.logradouro), nro: String(raw.numeroEndereco), xCpl: String(raw.complemento || "") || null,
    xBairro: String(raw.bairro), cMun: digits(raw.codigoMunicipio), xMun: String(raw.nomeMunicipio), UF: "AL",
    CEP: digits(raw.cep), cPais: "1058", xPais: "BRASIL", fone: digits(raw.telefone) || null,
  });

  const destDoc = digits(raw.destDocumento);
  if (destDoc) {
    nfe.tagDest({
      ...(destDoc.length === 14 ? { CNPJ: destDoc } : { CPF: destDoc }),
      xNome: String(raw.destNome || (model === "65" ? "CONSUMIDOR" : "DESTINATARIO")), indIEDest: "9",
    });
    if (model === "55") {
      nfe.tagEnderDest({
        xLgr: String(raw.destLogradouro || "RUA TESTE"), nro: String(raw.destNumero || "1"), xBairro: String(raw.destBairro || "CENTRO"),
        cMun: digits(raw.destCodigoMunicipio || raw.codigoMunicipio), xMun: String(raw.destMunicipio || raw.nomeMunicipio), UF: String(raw.destUF || "AL"),
        CEP: digits(raw.destCep || raw.cep), cPais: "1058", xPais: "BRASIL",
      });
    }
  }

  nfe.tagProd([{
    cProd: String(raw.codigoProduto || "1"), cEAN: "SEM GTIN", xProd: String(raw.produto), NCM: digits(raw.ncm),
    CFOP: digits(raw.cfop), uCom: String(raw.unidade || "UN"), qCom: qty.toFixed(4), vUnCom: unit.toFixed(10), vProd: total.toFixed(2),
    cEANTrib: "SEM GTIN", uTrib: String(raw.unidade || "UN"), qTrib: qty.toFixed(4), vUnTrib: unit.toFixed(10), indTot: "1",
  }]);
  if (String(raw.crt || "1") === "1") nfe.tagProdICMSSN(0, { orig: String(raw.origem || "0"), CSOSN: String(raw.csosn || "400") });
  else nfe.tagProdICMS(0, { orig: String(raw.origem || "0"), CST: String(raw.cst || "00"), modBC: 3, vBC: 0, pICMS: 0, vICMS: 0 });
  nfe.tagProdPIS(0, { CST: "49", qBCProd: 0, vAliqProd: 0, vPIS: 0 });
  nfe.tagProdCOFINS(0, { CST: "49", qBCProd: 0, vAliqProd: 0, vCOFINS: 0 });
  nfe.tagTotal();
  nfe.tagTransp({ modFrete: 9 });
  nfe.tagDetPag([{ indPag: 0, tPag: String(raw.formaPagamento || "17"), vPag: money(total) }]);
  nfe.tagTroco("0.00");
  return { xml: nfe.xml(), total, validation };
}

function extractReturn(xml: string) {
  const pick = (tag: string) => xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`))?.[1] || null;
  return { cStat: pick("cStat"), xMotivo: pick("xMotivo"), chNFe: pick("chNFe"), nProt: pick("nProt"), raw: xml };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Não autenticado" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Não autenticado" }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((row: any) => row.role === "admin")) return json({ error: "Acesso exclusivo para administradores" }, 403);

    const body = await req.json() as Record<string, unknown>;
    if (!await verifyEngineToken(String(body.engine_token || ""), user.id)) return json({ error: "Sessão da Feature expirada. Desbloqueie novamente." }, 401);
    if (body.environment === "producao") return json({ error: "Produção bloqueada. Este laboratório usa somente homologação." }, 403);

    const model: "55" | "65" = body.model === "55" ? "55" : "65";
    const raw = (body.data || {}) as Record<string, unknown>;
    const action = String(body.action || "validate");

    if (action === "validate") return json({ ...validateSale(raw, model), model, environment: "homologacao", provider: "sefaz-svrs" });

    const { pfx, password, cert } = certificateFromBody(body);
    const certificate = certInfo(cert);
    if (!certificate.validoAgora) return json({ error: "Certificado fora do período de validade.", certificate }, 422);
    if (cert.titular.cnpj && digits(raw.cnpjEmitente) && cert.titular.cnpj !== digits(raw.cnpjEmitente)) return json({ error: "O CNPJ informado não corresponde ao certificado.", certificate }, 422);

    if (action === "inspect_certificate") return json({ ok: true, certificate });
    const tools = toolsFor(model, raw, pfx, password);

    if (action === "test_connection") {
      const response = await tools.sefazStatus();
      const parsed = extractReturn(response);
      return json({ ok: true, connected: true, certificate, model, environment: "homologacao", response: parsed });
    }
    if (action === "preview") {
      const built = buildXml(model, raw);
      const signed = await tools.xmlSign(built.xml);
      return json({ ok: true, valid: true, signed: true, certificate, model, total: built.total, xml: signed, warnings: built.validation.warnings });
    }
    if (action === "issue") {
      const built = buildXml(model, raw);
      const signed = await tools.xmlSign(built.xml);
      const response = await tools.sefazEnviaLote(signed, { indSinc: 1 });
      const parsed = extractReturn(response);
      return json({ ok: parsed.cStat === "100" || parsed.cStat === "104", certificate, model, total: built.total, response: parsed });
    }
    if (action === "query") {
      const key = digits(body.reference);
      if (key.length !== 44) return json({ error: "Informe a chave de acesso com 44 dígitos." }, 400);
      const response = await tools.consultarNFe(key);
      return json({ ok: true, model, response: extractReturn(response) });
    }
    return json({ error: "Ação inválida." }, 400);
  } catch (reason) {
    console.error("dfe-feature", reason);
    const anyReason = reason as any;
    return json({
      error: reason instanceof Error ? reason.message : String(reason),
      errors: anyReason?.validation?.errors ?? [], warnings: anyReason?.validation?.warnings ?? [],
      detail: anyReason?.stderr || anyReason?.code || null,
    }, 500);
  }
});
