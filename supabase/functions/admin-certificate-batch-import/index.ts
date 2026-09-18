import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { Buffer } from 'node:buffer';
import { lerCertificado } from 'npm:nfse-node@0.3.2/certificado';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const DEFAULT_CLIENT_PASSWORD = '5BWasgc1@';
const clean = (value: unknown) => String(value ?? '').trim();
const digits = (value: unknown) => clean(value).replace(/\D/g, '');
const enc = new TextEncoder();
const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');

async function context(req: Request) {
  const auth = req.headers.get('authorization');
  if (!auth) throw new Error('Não autenticado.');
  const url = Deno.env.get('SUPABASE_URL')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  if (!user) throw new Error('Não autenticado.');
  const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
  if (!roles?.some((row: any) => row.role === 'admin')) throw new Error('Acesso exclusivo para administradores.');
  return { admin, user };
}

async function aesKey() {
  const secret = Deno.env.get('ACCOUNTING_ENGINE_SESSION_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret) throw new Error('Chave do cofre fiscal não configurada.');
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(`ws-fiscal-vault:${secret}`));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt']);
}
async function encrypt(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(), enc.encode(value));
  return { ciphertext: b64(new Uint8Array(cipher)), iv: b64(iv) };
}
async function sha256(bytes: Uint8Array) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...digest].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function filenameCnpj(name: string) {
  const compact = clean(name).replace(/\D/g, '');
  const match = compact.match(/\d{14}/);
  return match?.[0] || '';
}

function openCertificate(base64: string, passwords: string[]) {
  const unique = [...new Set(passwords.map(clean).filter(Boolean))];
  for (const password of unique) {
    try {
      const raw = lerCertificado(Buffer.from(base64, 'base64'), password);
      return { raw, password };
    } catch {}
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  try {
    const { admin, user } = await context(req);
    const body = await req.json().catch(() => ({})) as Record<string, any>;
    const fileName = clean(body.file_name);
    const certificateBase64 = clean(body.certificate_base64);
    const preferredPassword = clean(body.preferred_password);

    if (!/\.(pfx|p12)$/i.test(fileName)) return json({ error: 'Arquivo inválido. Use .pfx ou .p12.' }, 422);
    if (!certificateBase64) return json({ error: 'Certificado vazio.' }, 422);
    if (certificateBase64.length > 3_000_000) return json({ error: 'O certificado deve ter no máximo 2 MB.' }, 422);

    const cnpjFromFile = filenameCnpj(fileName);
    const opened = openCertificate(certificateBase64, [
      preferredPassword,
      '12345678',
      DEFAULT_CLIENT_PASSWORD,
      '1234',
      cnpjFromFile,
    ]);
    if (!opened) {
      return json({
        error: 'Não foi possível abrir o certificado com as senhas automáticas.',
        code: 'password_required',
        file_name: fileName,
      }, 422);
    }

    const cert = opened.raw as any;
    const cnpj = digits(cert?.titular?.cnpj);
    const holderName = clean(cert?.titular?.nome).toUpperCase();
    if (cnpj.length !== 14) return json({ error: 'O certificado não contém um CNPJ empresarial válido.' }, 422);

    const validFrom = cert.validadeInicio instanceof Date ? cert.validadeInicio : new Date(cert.validadeInicio);
    const validUntil = cert.validadeFim instanceof Date ? cert.validadeFim : new Date(cert.validadeFim);
    if (!Number.isFinite(validFrom.getTime()) || !Number.isFinite(validUntil.getTime())) {
      return json({ error: 'Não foi possível validar a vigência do certificado.' }, 422);
    }

    let { data: company, error: companyError } = await admin
      .from('companies')
      .select('*')
      .or(`cnpj.eq.${cnpj},document_number.eq.${cnpj}`)
      .limit(1)
      .maybeSingle();
    if (companyError) throw companyError;

    let companyCreated = false;
    if (!company) {
      const { data: created, error } = await admin
        .from('companies')
        .insert({
          company_name: holderName || `CNPJ ${cnpj}`,
          trade_name: holderName || null,
          cnpj,
          document_type: 'cnpj',
          document_number: cnpj,
          registry_payload: {
            origin: 'bulk_certificate_import',
            certificate_holder_name: holderName || null,
            certificate_imported_at: new Date().toISOString(),
          },
          registry_updated_at: null,
        })
        .select('*')
        .single();
      if (error) throw error;
      company = created;
      companyCreated = true;
    }

    let { data: fiscal, error: fiscalError } = await admin
      .from('fiscal_companies')
      .select('*')
      .eq('cnpj', cnpj)
      .maybeSingle();
    if (fiscalError) throw fiscalError;

    let fiscalCreated = false;
    if (!fiscal) {
      const { data: created, error } = await admin
        .from('fiscal_companies')
        .insert({
          company_id: company.id,
          cnpj,
          razao_social: company.company_name || holderName,
          nome_fantasia: company.trade_name || company.company_name || holderName,
          inscricao_estadual: company.state_registration || null,
          endereco: {
            cep: company.postal_code || null,
            logradouro: company.street || null,
            numero: company.street_number || null,
            complemento: company.complement || null,
            bairro: company.district || null,
            municipio: company.city || null,
            uf: company.state || null,
          },
          uf: company.state || null,
          codigo_municipio: company.city_ibge_code || null,
          municipio: company.city || null,
          regime_tributario: company.tax_regime || null,
          ambiente_padrao: 'producao',
          status: 'ativa',
          fiscal_settings: {
            origin_scope: 'office_client',
            origin: 'bulk_certificate_import',
            linked_at: new Date().toISOString(),
          },
          created_by: user.id,
        })
        .select('*')
        .single();
      if (error) throw error;
      fiscal = created;
      fiscalCreated = true;
    } else if (!fiscal.company_id) {
      const { data: updated, error } = await admin
        .from('fiscal_companies')
        .update({ company_id: company.id, updated_at: new Date().toISOString() })
        .eq('id', fiscal.id)
        .select('*')
        .single();
      if (error) throw error;
      fiscal = updated;
    } else if (String(fiscal.company_id) !== String(company.id)) {
      return json({
        error: 'O CNPJ já está vinculado a outro cadastro do escritório.',
        code: 'company_conflict',
        cnpj,
      }, 409);
    }

    const certificateBytes = new Uint8Array(Buffer.from(certificateBase64, 'base64'));
    const fingerprint = await sha256(certificateBytes);

    const { data: fingerprintMatch, error: fingerprintError } = await admin
      .from('fiscal_certificates')
      .select('id,valid_until,is_active')
      .eq('company_id', fiscal.id)
      .eq('fingerprint', fingerprint)
      .limit(1)
      .maybeSingle();
    if (fingerprintError) throw fingerprintError;
    if (fingerprintMatch?.id) {
      return json({
        ok: true,
        status: 'already_exists',
        company_id: company.id,
        company_name: company.trade_name || company.company_name,
        cnpj,
        valid_until: fingerprintMatch.valid_until,
      });
    }

    const { data: active, error: activeError } = await admin
      .from('fiscal_certificates')
      .select('id,certificate_name,valid_until,is_active')
      .eq('company_id', fiscal.id)
      .eq('is_active', true)
      .order('valid_until', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activeError) throw activeError;
    if (active?.id) {
      return json({
        ok: true,
        status: 'skipped_active_certificate',
        company_id: company.id,
        company_name: company.trade_name || company.company_name,
        cnpj,
        valid_until: active.valid_until,
      });
    }

    const pfxCrypt = await encrypt(certificateBase64);
    const passCrypt = await encrypt(opened.password);

    const { data: saved, error: saveError } = await admin
      .from('fiscal_certificates')
      .insert({
        company_id: fiscal.id,
        certificate_name: fileName,
        certificate_ciphertext: pfxCrypt.ciphertext,
        certificate_iv: pfxCrypt.iv,
        password_ciphertext: passCrypt.ciphertext,
        password_iv: passCrypt.iv,
        holder_cnpj: cnpj,
        holder_name: holderName || null,
        valid_from: validFrom.toISOString().slice(0, 10),
        valid_until: validUntil.toISOString().slice(0, 10),
        serial_number: clean(cert?.serialNumber) || null,
        fingerprint,
        is_active: true,
        inspected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user.id,
      })
      .select('id,valid_until')
      .single();
    if (saveError) throw saveError;

    await admin.from('saas_audit_logs').insert({
      actor_user_id: user.id,
      action: 'office_client_certificate_bulk_imported',
      resource_type: 'company',
      resource_id: company.id,
      is_sensitive: true,
      metadata: {
        cnpj,
        fiscal_company_id: fiscal.id,
        certificate_id: saved.id,
        company_created: companyCreated,
        fiscal_created: fiscalCreated,
      },
    }).catch(() => null);

    return json({
      ok: true,
      status: 'imported',
      company_id: company.id,
      company_name: company.trade_name || company.company_name,
      cnpj,
      valid_until: saved.valid_until,
      company_created: companyCreated,
      fiscal_created: fiscalCreated,
    });
  } catch (error: any) {
    console.error('admin-certificate-batch-import', error);
    const message = error?.message || 'Falha ao importar certificado.';
    const status = /Não autenticado/.test(message) ? 401 : /Acesso exclusivo/.test(message) ? 403 : 500;
    return json({ error: message }, status);
  }
});