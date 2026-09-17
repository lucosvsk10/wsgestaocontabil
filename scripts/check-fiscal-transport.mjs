import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('supabase/functions');
const extensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);
const allowedAuthorityFiles = new Set([
  path.normalize('supabase/functions/dfe-issue-native/qrcode.ts'),
]);
const patterns = [
  { name: 'Deno mTLS transport', re: /Deno\.createHttpClient\s*\(/g },
  { name: 'Node HTTPS transport inside Supabase', re: /(?:from\s+["']node:https["']|require\(\s*["']node:https["']\s*\))/g },
  { name: 'Direct SVRS authority URL', re: /https:\/\/[A-Za-z0-9.-]*svrs\.rs\.gov\.br\b/gi },
  { name: 'Direct SEFAZ AL authority URL', re: /https:\/\/[A-Za-z0-9.-]*sefaz\.al\.gov\.br\b/gi },
  { name: 'Direct national NF-e authority URL', re: /https:\/\/[A-Za-z0-9.-]*nfe\.fazenda\.gov\.br\b/gi },
  { name: 'Direct Receita/Fazenda authority URL', re: /https:\/\/[A-Za-z0-9.-]*(?:receita|fazenda)\.gov\.br\b/gi },
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (extensions.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function lineAt(text, index) {
  const start = text.lastIndexOf('\n', index - 1) + 1;
  const end = text.indexOf('\n', index);
  return text.slice(start, end < 0 ? text.length : end);
}
function allowedStaticLiteral(rel, line) {
  if (allowedAuthorityFiles.has(rel)) return true;
  if (rel === path.normalize('supabase/functions/saas-mdfe-issue/index.ts') && /qrCodMDFe|qrCode/.test(line)) return true;
  if (rel === path.normalize('supabase/functions/fiscal-sales-connector/index.ts') && /moduleBase|bootstrap|rpcEndpoint/.test(line)) return true;
  return false;
}

const violations = [];
for (const file of walk(root)) {
  const rel = path.normalize(path.relative(process.cwd(), file));
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of patterns) {
    pattern.re.lastIndex = 0;
    let match;
    while ((match = pattern.re.exec(text))) {
      const lineNumber = text.slice(0, match.index).split('\n').length;
      const sourceLine = lineAt(text, match.index);
      if (pattern.name.includes('authority URL') && allowedStaticLiteral(rel, sourceLine)) continue;
      violations.push(`${rel}:${lineNumber} — ${pattern.name}`);
      if (pattern.re.lastIndex === match.index) pattern.re.lastIndex += 1;
    }
  }
}

if (violations.length) {
  console.error('Direct fiscal transports are forbidden in Supabase Edge Functions. Route them through the Vercel fiscal gateways.');
  for (const item of violations) console.error(`- ${item}`);
  process.exit(1);
}
console.log('Fiscal transport guard: OK — no direct authority transport found in Supabase Edge Function sources.');
