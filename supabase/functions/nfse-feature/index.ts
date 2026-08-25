import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import { lerCertificado } from "npm:nfse-node@0.3.2/certificado";
import { assinarXml, assinaturaValida } from "npm:nfse-node@0.3.2/assinatura";
import { gerarIdDps, montarXmlDps } from "npm:nfse-node@0.3.2/dps";
import { criarClienteSefin, ErroComunicacaoSefin } from "npm:nfse-node@0.3.2/cliente";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

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
  } catch {
    return false;
  }
}

const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");

function validCpf(value: string) {
  const cpf = digits(value);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  return check === Number(cpf[10]);
}

function validCnpj(value: string) {
  const cnpj = digits(value);
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1+$/.test(cnpj)) return false;
  const calc = (base: string, weights: number[]) => {
    const sum = weights.reduce((acc, weight, index) => acc + Number(base[index]) * weight, 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const d1 = calc(cnpj.slice(0, 12), [5,4,3,2,9,8,7,6,5,4,3,2]);
  const d2 = calc(cnpj.slice(0, 12) + d1, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return cnpj.endsWith(`${d1}${d2}`);
}

function validate(raw: Record<string, unknown>) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const cnpj = digits(raw.cnpjPrestador);
  const municipality = digits(raw.municipioEmissor);
  const serviceMunicipality = digits(raw.municipioPrestacao || raw.municipioEmissor);
  const code = digits(raw.codigoTributacao);
  const cnpjTomador = digits(raw.cnpjTomador);
  const cpfTomador = digits(raw.cpfTomador);
  const nomeTomador = String(raw.nomeTomador || "").trim();

  if (!validCnpj(cnpj)) errors.push("CNPJ do prestador inválido.");
  if (!/^\d{7}$/.test(municipality)) errors.push("Código IBGE do município emissor deve ter 7 dígitos.");
  if (!/^\d{7}$/.test(serviceMunicipality)) errors.push("Código IBGE do município da prestação deve ter 7 dígitos.");
  if (!/^\d{6}$/.test(code)) errors.push("Código de tributação nacional deve ter 6 dígitos.");
  if (!String(raw.descricao || "").trim()) errors.push("Informe a descrição do serviço.");
  if (!(Number(raw.valor) > 0)) errors.push("O valor do serviço deve ser maior que zero.");
  if (cnpjTomador && !validCnpj(cnpjTomador)) errors.push("CNPJ do tomador inválido.");
  if (cpfTomador && !validCpf(cpfTomador)) errors.push("CPF do tomador inválido.");
  if (cnpjTomador && cpfTomador) errors.push("Informe CNPJ ou CPF do tomador, não os dois.");
  if ((cnpjTomador || cpfTomador) && !nomeTomador) errors.push("Informe o nome/razão social do tomador.");
  if (!cnpjTomador && !cpfTomador) warnings.push("Tomador não identificado. Use somente quando a operação permitir.");
  if (!String(raw.numero || "").trim()) errors.push("Informe o número da DPS.");
  if (!String(raw.serie || "").trim()) errors.push("Informe a série da DPS.");
  return { valid: errors.length === 0, errors, warnings };
}

function certificateFromBody(body: Record<string, unknown>) {
  const pfxBase64 = String(body.certificate_base64 || "").trim();
  const password = String(body.certificate_password || "");
  if (!pfxBase64) throw new Error("Selecione um certificado A1 (.pfx ou .p12).");
  if (!password) throw new Error("Informe a senha do certificado A1.");
  const bytes = Buffer.from(pfxBase64, "base64");
  if (!bytes.length) throw new Error("O certificado enviado está vazio.");
  return lerCertificado(bytes, password);
}

function certInfo(cert: ReturnType<typeof lerCertificado>) {
  return {
    cnpj: cert.titular.cnpj,
    cpf: cert.titular.cpf,
    nome: cert.titular.nome,
    validadeInicio: cert.validadeInicio.toISOString(),
    validadeFim: cert.validadeFim.toISOString(),
    validoAgora: cert.validadeInicio <= new Date() && cert.validadeFim >= new Date(),
    cadeia: cert.cadeiaPem.length,
  };
}

function buildDps(raw: Record<string, unknown>, cert: ReturnType<typeof lerCertificado>) {
  const validation = validate(raw);
  if (!validation.valid) {
    const error = new Error(validation.errors.join(" "));
    (error as any).validation = validation;
    throw error;
  }

  const cnpjPrestador = digits(raw.cnpjPrestador);
  if (cert.titular.cnpj && cert.titular.cnpj !== cnpjPrestador) {
    throw new Error(`O certificado pertence ao CNPJ ${cert.titular.cnpj}, mas o prestador informado é ${cnpjPrestador}.`);
  }

  const cnpjTomador = digits(raw.cnpjTomador);
  const cpfTomador = digits(raw.cpfTomador);
  const simples = String(raw.simples || "1") as "1" | "2" | "3";
  const tributacaoIss = String(raw.tributacaoIss || "1") as "1" | "2" | "3" | "4";
  const prestRegTrib: Record<string, string> = { opSimpNac: simples, regEspTrib: "0" };
  if (simples === "3") prestRegTrib.regApTribSN = "1";

  const dados: any = {
    tpAmb: "2",
    dhEmi: new Date(),
    verAplic: "WS1.0",
    serie: String(raw.serie || "1"),
    nDPS: String(raw.numero || "1"),
    dCompet: new Date(),
    tpEmit: "1",
    cLocEmi: digits(raw.municipioEmissor),
    prest: {
      CNPJ: cnpjPrestador,
      ...(cert.titular.nome ? { xNome: cert.titular.nome } : {}),
      regTrib: prestRegTrib,
    },
    serv: {
      locPrest: { cLocPrestacao: digits(raw.municipioPrestacao || raw.municipioEmissor) },
      cServ: {
        cTribNac: digits(raw.codigoTributacao),
        xDescServ: String(raw.descricao || "").trim(),
      },
    },
    valores: {
      vServPrest: { vServ: Number(raw.valor) },
      trib: {
        tribMun: { tribISSQN: tributacaoIss, tpRetISSQN: "1" },
        totTrib: { pTotTribFed: 0, pTotTribEst: 0, pTotTribMun: 0 },
      },
    },
  };

  if (cnpjTomador || cpfTomador) {
    dados.toma = {
      ...(cnpjTomador ? { CNPJ: cnpjTomador } : { CPF: cpfTomador }),
      xNome: String(raw.nomeTomador || "").trim(),
    };
  }

  const mounted = montarXmlDps(dados);
  const signedXml = assinarXml(mounted.xml, mounted.id, {
    chavePrivadaPem: cert.chavePrivadaPem,
    certificadoPem: cert.certificadoPem,
  });
  if (!assinaturaValida(signedXml)) throw new Error("A DPS foi montada, mas a validação criptográfica da assinatura falhou.");

  return { id: mounted.id, xml: mounted.xml, signedXml, validation };
}

function clientFor(cert: ReturnType<typeof lerCertificado>) {
  return criarClienteSefin({
    ambiente: "homologacao",
    certificado: {
      chavePrivadaPem: cert.chavePrivadaPem,
      certificadoPem: [cert.certificadoPem, ...cert.cadeiaPem].join("\n"),
    },
    timeoutMs: 45_000,
  });
}

function serializeError(reason: unknown) {
  if (reason instanceof ErroComunicacaoSefin) {
    return {
      error: reason.message,
      status: reason.status ?? null,
      errors: reason.erros ?? [],
      response: reason.corpoResposta ?? null,
    };
  }
  const anyReason = reason as any;
  return {
    error: reason instanceof Error ? reason.message : "Falha interna na Feature.",
    status: anyReason?.status ?? null,
    errors: anyReason?.validation?.errors ?? [],
    warnings: anyReason?.validation?.warnings ?? [],
    response: anyReason?.corpoResposta ?? null,
  };
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
    if (!await verifyEngineToken(String(body.engine_token || ""), user.id)) {
      return json({ error: "Sessão da Feature expirada. Desbloqueie novamente." }, 401);
    }

    const action = String(body.action || "validate");
    const raw = (body.data || {}) as Record<string, unknown>;

    if (body.environment === "producao") {
      return json({ error: "Produção está bloqueada neste laboratório. A Feature usa somente Produção Restrita da NFS-e Nacional." }, 403);
    }

    if (action === "validate") {
      return json({ ...validate(raw), provider: "sefin-nacional", environment: "producao-restrita" });
    }

    const cert = certificateFromBody(body);
    const info = certInfo(cert);
    if (!info.validoAgora) return json({ error: "O certificado está fora do período de validade.", certificate: info }, 422);

    if (action === "inspect_certificate") {
      return json({ ok: true, certificate: info, provider: "sefin-nacional", environment: "producao-restrita" });
    }

    const client = clientFor(cert);

    if (action === "test_connection") {
      const validation = validate(raw);
      if (!validation.valid) return json({ ...validation, certificate: info }, 422);
      const idDps = gerarIdDps({
        documentoEmitente: digits(raw.cnpjPrestador),
        codigoMunicipioEmissor: digits(raw.municipioEmissor),
        serie: String(raw.serie || "1"),
        numero: String(raw.numero || "1"),
      });
      try {
        const response = await client.consultarDps(idDps);
        return json({ ok: true, connected: true, certificate: info, idDps, status: response.status, response: response.corpo });
      } catch (reason) {
        if (reason instanceof ErroComunicacaoSefin && [400, 404].includes(reason.status ?? 0)) {
          return json({ ok: true, connected: true, certificate: info, idDps, status: reason.status, note: "A SEFIN respondeu ao certificado. A DPS consultada apenas ainda não existe.", response: reason.corpoResposta });
        }
        throw reason;
      }
    }

    if (action === "preview") {
      const dps = buildDps(raw, cert);
      return json({
        ok: true,
        valid: true,
        certificate: info,
        idDps: dps.id,
        signed: true,
        xml: dps.signedXml,
        warnings: dps.validation.warnings,
      });
    }

    if (action === "issue") {
      const dps = buildDps(raw, cert);
      const result = await client.emitirDps(dps.signedXml);
      return json({
        ok: true,
        valid: true,
        certificate: info,
        idDps: dps.id,
        status: result.status,
        chaveAcesso: result.chaveAcesso,
        nfseXml: result.nfseXml,
        response: result.corpo,
        warnings: dps.validation.warnings,
      });
    }

    if (action === "query") {
      const key = digits(body.reference);
      if (!/^\d{50}$/.test(key)) return json({ error: "A chave de acesso deve ter 50 dígitos." }, 400);
      const result = await client.consultarNfse(key);
      return json({ ok: true, certificate: info, chaveAcesso: key, status: result.status, response: result.corpo });
    }

    if (action === "municipality") {
      const code = digits(raw.municipioEmissor);
      if (!/^\d{7}$/.test(code)) return json({ error: "Informe o código IBGE do município." }, 400);
      const result = await client.consultarConvenio(code);
      return json({ ok: true, certificate: info, municipio: code, response: result });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (reason) {
    console.error("nfse-feature", reason instanceof Error ? reason.message : reason);
    const serialized = serializeError(reason);
    const status = typeof serialized.status === "number" && serialized.status >= 400 && serialized.status <= 599 ? serialized.status : 500;
    return json(serialized, status);
  }
});
