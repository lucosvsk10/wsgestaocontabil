import fs from 'node:fs';

const file = 'supabase/functions/saas-registry-lookup/index.ts';
let text = fs.readFileSync(file, 'utf8');
const before = text;

text = text.replace("import JSZip from 'npm:jszip@3.10.1';\n", '');

const replacement = `async function lookupAlStateRegistration(admin: any, cnpj: string) {
  try {
    const { data: gateway } = await admin
      .from('_fiscal_vercel_gateway_token')
      .select('token')
      .eq('id', true)
      .maybeSingle();
    const gatewayToken = clean(gateway?.token);
    if (!gatewayToken) return null;
    const response = await fetch('https://ws-nfse-sefin-probe.vercel.app/api/sefaz-al-registry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: \`Bearer \${gatewayToken}\`,
      },
      body: JSON.stringify({ cnpj }),
      signal: AbortSignal.timeout(60000),
    });
    const raw = await response.json().catch(() => ({})) as any;
    if (!response.ok || !raw?.ok || !raw?.found) return null;
    return {
      state_registration: digits(raw.state_registration),
      ie_indicator: clean(raw.ie_indicator || '1'),
      icms_taxpayer: raw.icms_taxpayer !== false,
      state_registry_status: clean(raw.state_registry_status),
      state_source: clean(raw.state_source || 'SEFAZ/AL - SINTEGRA'),
    };
  } catch (error) {
    console.warn('SEFAZ/AL IE gateway lookup failed', error);
    return null;
  }
}

async function enrichStateRegistry(admin: any, cnpj: string, base: any) {`;

const block = /let alRegistryCache:[\s\S]*?async function enrichStateRegistry\(cnpj: string, base: any\) \{/;
if (!block.test(text)) throw new Error('registry direct transport block not found');
text = text.replace(block, replacement);
text = text.replace('stateData = await lookupAlStateRegistration(cnpj);', 'stateData = await lookupAlStateRegistration(admin, cnpj);');
text = text.replace('const data = await enrichStateRegistry(cnpj, federal);', 'const data = await enrichStateRegistry(admin, cnpj, federal);');

if (text === before) throw new Error('registry patch made no changes');
if (/gcs2?\.sefaz\.al\.gov\.br/i.test(text)) throw new Error('direct SEFAZ AL registry URL remained after patch');
fs.writeFileSync(file, text);
console.log('Patched saas-registry-lookup to use the Vercel SEFAZ/AL registry gateway.');
