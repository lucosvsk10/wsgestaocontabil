import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

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

const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '');

async function context(req: Request) {
  const authorization = req.headers.get('authorization');
  if (!authorization) throw new Error('Não autenticado.');
  const url = Deno.env.get('SUPABASE_URL')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user } } = await admin.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
  if (!user) throw new Error('Não autenticado.');
  const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
  if (!roles?.some((row: any) => row.role === 'admin')) {
    throw new Error('Acesso exclusivo para administradores.');
  }
  return { admin };
}

async function countRows(query: any) {
  const result = await query;
  if (result.error) throw result.error;
  return Number(result.count || 0);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  try {
    const { admin } = await context(req);
    const body = await req.json().catch(() => ({}));
    const companyId = String(body?.company_id || '').trim();
    if (!companyId) return json({ error: 'Empresa não informada.' }, 422);

    const { data: company, error: companyError } = await admin
      .from('companies')
      .select('id,company_name,trade_name,cnpj,document_number')
      .eq('id', companyId)
      .maybeSingle();
    if (companyError) throw companyError;
    if (!company) return json({ error: 'Empresa não encontrada.' }, 404);

    const cnpj = digits(company.cnpj || company.document_number);

    let { data: fiscalCompany, error: fiscalError } = await admin
      .from('fiscal_companies')
      .select('id,company_id,cnpj,razao_social,nome_fantasia')
      .eq('company_id', companyId)
      .maybeSingle();
    if (fiscalError) throw fiscalError;

    if (!fiscalCompany && cnpj.length === 14) {
      const fallback = await admin
        .from('fiscal_companies')
        .select('id,company_id,cnpj,razao_social,nome_fantasia')
        .eq('cnpj', cnpj)
        .maybeSingle();
      if (fallback.error) throw fallback.error;
      fiscalCompany = fallback.data || null;
    }

    let certificate: any = null;
    let extractorLinks: any[] = [];
    let dfeCount = 0;
    let dfeFullXmlCount = 0;
    let salesCount = 0;
    let lastDfe: any = null;
    let lastSale: any = null;

    if (fiscalCompany?.id) {
      const [
        certResult,
        extractorResult,
        dfeCountResult,
        dfeFullXmlResult,
        salesCountResult,
        lastDfeResult,
        lastSaleResult,
      ] = await Promise.all([
        admin
          .from('fiscal_certificates')
          .select('id,certificate_name,valid_until,is_active')
          .eq('company_id', fiscalCompany.id)
          .eq('is_active', true)
          .order('valid_until', { ascending: false })
          .limit(1)
          .maybeSingle(),
        admin
          .from('extractor_companies')
          .select('id,status,automatic_sync,account_id,extractor_accounts(id,name,status,plan_code,lifetime_access)')
          .eq('fiscal_company_id', fiscalCompany.id)
          .neq('status', 'removed'),
        admin
          .from('fiscal_dfe_documents')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', fiscalCompany.id),
        admin
          .from('fiscal_dfe_documents')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', fiscalCompany.id)
          .eq('full_xml', true),
        admin
          .from('fiscal_sales_documents')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', fiscalCompany.id),
        admin
          .from('fiscal_dfe_documents')
          .select('id,issue_date,received_at,document_kind,direction,note_number')
          .eq('company_id', fiscalCompany.id)
          .order('issue_date', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle(),
        admin
          .from('fiscal_sales_documents')
          .select('id,issue_date,first_seen_at,model,document_number')
          .eq('company_id', fiscalCompany.id)
          .order('issue_date', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (certResult.error) throw certResult.error;
      if (extractorResult.error) throw extractorResult.error;
      if (dfeCountResult.error) throw dfeCountResult.error;
      if (dfeFullXmlResult.error) throw dfeFullXmlResult.error;
      if (salesCountResult.error) throw salesCountResult.error;
      if (lastDfeResult.error) throw lastDfeResult.error;
      if (lastSaleResult.error) throw lastSaleResult.error;

      certificate = certResult.data || null;
      extractorLinks = extractorResult.data || [];
      dfeCount = Number(dfeCountResult.count || 0);
      dfeFullXmlCount = Number(dfeFullXmlResult.count || 0);
      salesCount = Number(salesCountResult.count || 0);
      lastDfe = lastDfeResult.data || null;
      lastSale = lastSaleResult.data || null;
    }

    let issuerProfile: any = null;
    if (companyId) {
      const byCompany = await admin
        .from('saas_company_fiscal_profiles')
        .select('id,organization_id,company_id,tax_id,legal_name,trade_name,enabled_documents,fiscal_environment,updated_at')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (byCompany.error) throw byCompany.error;
      issuerProfile = byCompany.data || null;
    }

    if (!issuerProfile && cnpj.length === 14) {
      const { data: profiles, error: profileError } = await admin
        .from('saas_company_fiscal_profiles')
        .select('id,organization_id,company_id,tax_id,legal_name,trade_name,enabled_documents,fiscal_environment,updated_at')
        .eq('tax_id', cnpj)
        .order('updated_at', { ascending: false })
        .limit(1);
      if (profileError) throw profileError;
      issuerProfile = profiles?.[0] || null;
    }

    let issuer: any = {
      configured: false,
      organization_id: null,
      emissions: 0,
      last_emission_at: null,
      last_document_type: null,
      enabled_documents: [],
      environment: null,
    };

    if (issuerProfile?.organization_id) {
      const [emissionsCountResult, lastEmissionResult, subscriptionResult] = await Promise.all([
        admin
          .from('saas_fiscal_emissions')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', issuerProfile.organization_id),
        admin
          .from('saas_fiscal_emissions')
          .select('id,document_type,status,created_at,authorized_at')
          .eq('organization_id', issuerProfile.organization_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        admin
          .from('saas_subscriptions')
          .select('id,status,product_code,billing_mode,access_expires_at')
          .eq('organization_id', issuerProfile.organization_id)
          .eq('product_code', 'issuer')
          .in('status', ['active', 'trialing', 'past_due'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (emissionsCountResult.error) throw emissionsCountResult.error;
      if (lastEmissionResult.error) throw lastEmissionResult.error;
      if (subscriptionResult.error) throw subscriptionResult.error;

      issuer = {
        configured: true,
        organization_id: issuerProfile.organization_id,
        profile_id: issuerProfile.id,
        subscription_status: subscriptionResult.data?.status || null,
        emissions: Number(emissionsCountResult.count || 0),
        last_emission_at: lastEmissionResult.data?.authorized_at || lastEmissionResult.data?.created_at || null,
        last_document_type: lastEmissionResult.data?.document_type || null,
        enabled_documents: issuerProfile.enabled_documents || [],
        environment: issuerProfile.fiscal_environment || null,
      };
    }

    const activeExtractorLinks = extractorLinks.filter((row: any) => row.status === 'active');
    const latestFiscalActivity = [lastDfe?.issue_date || lastDfe?.received_at, lastSale?.issue_date || lastSale?.first_seen_at]
      .filter(Boolean)
      .sort()
      .reverse()[0] || null;

    return json({
      ok: true,
      company_id: companyId,
      fiscal_company_id: fiscalCompany?.id || null,
      certificate: certificate ? {
        configured: true,
        valid_until: certificate.valid_until,
        certificate_name: certificate.certificate_name,
      } : {
        configured: false,
        valid_until: null,
        certificate_name: null,
      },
      documents: {
        dfe: dfeCount,
        sales: salesCount,
        total: dfeCount + salesCount,
        full_xml: dfeFullXmlCount,
        last_activity_at: latestFiscalActivity,
      },
      extractor: {
        configured: activeExtractorLinks.length > 0,
        links: activeExtractorLinks.length,
        automatic_sync: activeExtractorLinks.some((row: any) => row.automatic_sync),
        accounts: activeExtractorLinks.map((row: any) => ({
          account_id: row.account_id,
          name: row.extractor_accounts?.name || null,
          plan_code: row.extractor_accounts?.plan_code || null,
          lifetime_access: Boolean(row.extractor_accounts?.lifetime_access),
        })),
        documents: dfeCount + salesCount,
        full_xml: dfeFullXmlCount,
        last_activity_at: latestFiscalActivity,
      },
      issuer,
    });
  } catch (error: any) {
    console.error('admin-client-overview', error);
    const message = error?.message || 'Falha ao carregar o resumo do cliente.';
    const status = /Não autenticado/.test(message) ? 401 : /Acesso exclusivo/.test(message) ? 403 : 500;
    return json({ error: message }, status);
  }
});