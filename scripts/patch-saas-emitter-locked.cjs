const fs = require('fs');
const path = 'src/components/saas/SaasEmission.tsx';
let text = fs.readFileSync(path, 'utf8');

function replaceOnce(oldValue, newValue, label) {
  const count = text.split(oldValue).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 occurrence, found ${count}`);
  text = text.replace(oldValue, newValue);
}

function replaceAllExact(oldValue, newValue, expected, label) {
  const count = text.split(oldValue).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected} occurrences, found ${count}`);
  text = text.split(oldValue).join(newValue);
}

replaceOnce(
  "const digits = (v: any) => String(v ?? '').replace(/\\D/g, '');\n",
  "const digits = (v: any) => String(v ?? '').replace(/\\D/g, '');\nconst formatTaxId = (value: any) => {\n  const raw = digits(value);\n  if (raw.length === 14) return raw.replace(/^(\\d{2})(\\d{3})(\\d{3})(\\d{4})(\\d{2})$/, '$1.$2.$3/$4-$5');\n  if (raw.length === 11) return raw.replace(/^(\\d{3})(\\d{3})(\\d{3})(\\d{2})$/, '$1.$2.$3-$4');\n  return value || '—';\n};\n",
  'formatTaxId helper'
);

replaceOnce(
  "function TabBar({\n",
  `function IssuerSummary({ profile, documentType }: { profile: any; documentType: string }) {\n  const service = documentType === 'NFS-e';\n  const registration = service\n    ? profile?.municipal_registration\n      ? \`IM \${profile.municipal_registration}\`\n      : 'IM não informada'\n    : profile?.state_registration\n      ? \`IE \${profile.state_registration}\`\n      : 'IE não informada';\n  const address = [profile?.street, profile?.street_number, profile?.district].filter(Boolean).join(', ');\n  const city = [profile?.city, profile?.state].filter(Boolean).join('/');\n  return (\n    <section className=\"mb-4 rounded-[6px] border border-[#cbd3dc] bg-[#edf1f4] px-4 py-3\">\n      <div className=\"flex flex-wrap items-start justify-between gap-3\">\n        <div className=\"min-w-0\">\n          <div className=\"flex flex-wrap items-center gap-x-2 gap-y-1\">\n            <span className=\"text-[10px] font-semibold uppercase tracking-[.08em] text-[#667382]\">\n              {service ? 'Prestador' : 'Emitente'}\n            </span>\n            <span className=\"rounded-full border border-[#c5cdd6] bg-white px-2 py-0.5 text-[9px] font-medium text-[#65717d]\">\n              Dados da Minha Empresa · somente leitura\n            </span>\n          </div>\n          <strong className=\"mt-1 block truncate text-[13px] font-semibold text-[#263442]\">\n            {profile?.legal_name || profile?.trade_name || 'Empresa fiscal não configurada'}\n          </strong>\n          {profile?.trade_name && profile?.trade_name !== profile?.legal_name && (\n            <span className=\"mt-0.5 block text-[10px] text-[#697785]\">{profile.trade_name}</span>\n          )}\n        </div>\n        <div className=\"grid min-w-[280px] flex-1 grid-cols-2 gap-x-5 gap-y-2 md:max-w-[640px] md:grid-cols-4\">\n          <div><span className=\"block text-[9px] text-[#7a8793]\">CNPJ/CPF</span><b className=\"text-[10px] font-medium text-[#354350]\">{formatTaxId(profile?.tax_id)}</b></div>\n          <div><span className=\"block text-[9px] text-[#7a8793]\">Inscrição</span><b className=\"text-[10px] font-medium text-[#354350]\">{registration}</b></div>\n          <div><span className=\"block text-[9px] text-[#7a8793]\">Município</span><b className=\"text-[10px] font-medium text-[#354350]\">{city || '—'}</b></div>\n          <div><span className=\"block text-[9px] text-[#7a8793]\">Endereço</span><b className=\"line-clamp-2 text-[10px] font-medium text-[#354350]\">{address || '—'}</b></div>\n        </div>\n      </div>\n    </section>\n  );\n}\nfunction TabBar({\n`,
  'IssuerSummary component'
);

replaceOnce(
  "    dest = customers.find(x => x.id === form.destinatarioId),\n    carrier = carriers.find(x => x.id === form.carrierId);",
  "    dest = customers.find(x => x.id === form.destinatarioId),\n    issuerCarrier = carriers.find(x => digits(x.tax_id) === digits(profile?.tax_id));",
  'issuer carrier binding'
);

replaceOnce(
  `  useEffect(() => {\n    if (carrier)\n      setForm((current: any) => ({\n        ...current,\n        rntrc: carrier.rntrc || current.rntrc,\n        plate: carrier.vehicle_plate || current.plate,\n      }));\n  }, [form.carrierId]);`,
  `  useEffect(() => {\n    if (!issuerCarrier) return;\n    setForm((current: any) => ({\n      ...current,\n      rntrc: current.rntrc || issuerCarrier.rntrc || '',\n      plate: current.plate || issuerCarrier.vehicle_plate || '',\n    }));\n  }, [issuerCarrier?.id, documentType]);`,
  'issuer transport defaults'
);

replaceOnce(
  `      const byCarrier = (rntrc: any) =>\n        carriers.find(item => digits(item.rntrc) === digits(rntrc))?.id || '';\n`,
  '',
  'remove reusable carrier resolver'
);
replaceAllExact("          values.carrierId = byCarrier(payload.rodo?.RNTRC);\n", '', 1, 'remove CT-e reused carrier');
replaceAllExact("          values.carrierId = byCarrier(payload.rntrc);\n", '', 1, 'remove MDF-e reused carrier');
replaceOnce(
  '    [carriers, customers, documentType, products, services]\n',
  '    [customers, documentType, products, services]\n',
  'reuse dependency cleanup'
);

replaceAllExact('carrier?.rntrc', 'issuerCarrier?.rntrc', 4, 'issuer RNTRC source');
replaceAllExact('carrier?.vehicle_plate', 'issuerCarrier?.vehicle_plate', 3, 'issuer vehicle source');
replaceAllExact('carrier?.vehicle_state', 'issuerCarrier?.vehicle_state', 1, 'issuer vehicle state source');

const carrierSelect = /\s*<Select\n\s*label=\"Transportadora\"\n\s*value=\{form\.carrierId\}\n\s*onChange=\{v => chooseOrCreate\('carrierId', v, 'Transportadoras'\)\}\n\s*>[\s\S]*?<\/Select>/g;
const carrierMatches = text.match(carrierSelect) || [];
if (carrierMatches.length !== 2) throw new Error(`transportadora selectors: expected 2, found ${carrierMatches.length}`);
text = text.replace(carrierSelect, '');

replaceOnce(
  '<Section title="Participantes" subtitle="Remetente, destinatário e transportadora.">',
  '<Section title="Participantes" subtitle="O emitente é a empresa desta conta. Selecione remetente e destinatário.">',
  'CT-e participants subtitle'
);
replaceOnce(
  '          title="Veículo e transportadora"\n          subtitle="Identifique o conjunto rodoviário principal."',
  '          title="Veículo do emitente"\n          subtitle="O emitente é a empresa desta conta. Informe apenas os dados do conjunto rodoviário."',
  'MDF-e vehicle title'
);
replaceOnce(
  '              hint="Preenchido automaticamente ao selecionar uma transportadora cadastrada."',
  '              hint="RNTRC do emitente. Quando houver cadastro correspondente à própria empresa, ele é preenchido automaticamente."',
  'RNTRC hint'
);

replaceAllExact(
  "['Transportadora', carrier?.legal_name || 'Transporte próprio'],",
  "['Emitente', profile?.trade_name || profile?.legal_name || '—'],",
  2,
  'review issuer facts'
);
replaceOnce(
  "['Veículo', form.plate || issuerCarrier?.vehicle_plate || '—'],",
  "['Veículo', form.plate || issuerCarrier?.vehicle_plate || '—'],",
  'vehicle review sanity'
);

replaceOnce(
  '        </header>\n        <TabBar',
  '        </header>\n        <IssuerSummary profile={profile} documentType={documentType} />\n        <TabBar',
  'issuer summary mount'
);

if (text.includes('carrier?.')) throw new Error('legacy carrier source still present');
fs.writeFileSync(path, text);
console.log('SaaS emitter lock patch applied.');
