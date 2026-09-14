// @vitest-environment node
// Contract tests: fake certificate parser and backend; never emits or queries SEFAZ.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { Buffer } from 'node:buffer';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import {
  readJsonLimited,
  validateCertificateInput,
  RequestError,
} from '../../../supabase/functions/_shared/request-guards';

const source = readFileSync('supabase/functions/extractor-company-config/index.ts', 'utf8').replace(
  /^import[\s\S]*?;/gm,
  ''
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
function backend(
  options: {
    noUser?: boolean;
    denied?: boolean;
    expired?: boolean;
    badPassword?: boolean;
    limited?: boolean;
    saveError?: boolean;
    large?: boolean;
  } = {}
) {
  let handler!: (request: Request) => Promise<Response>;
  const writes = vi.fn();
  const rpc = vi
    .fn()
    .mockResolvedValue(
      options.saveError
        ? { error: { code: 'XX000', message: 'internal-secret' } }
        : { data: 'company-id', error: null }
    );
  const consume = vi.fn().mockResolvedValue({ allowed: !options.limited });
  const admin = {
    auth: { getUser: async () => ({ data: { user: options.noUser ? null : { id: 'user' } } }) },
    rpc,
    from: (table: string) => {
      const data =
        table === 'user_roles'
          ? []
          : table === 'organization_members'
          ? options.denied
            ? []
            : [{ organization_id: 'org', role: 'owner', status: 'active' }]
          : table === 'extractor_accounts'
          ? [{ id: 'account', organization_id: 'org', status: 'active', lifetime_access: true }]
          : [];
      const query: any = { then: (resolve: any) => resolve({ data, error: null }) };
      for (const method of ['select', 'eq', 'neq', 'in', 'order', 'limit', 'maybeSingle', 'single'])
        query[method] = () => query;
      for (const method of ['insert', 'update', 'upsert', 'delete'])
        query[method] = (...args: any[]) => {
          writes(method, args);
          return query;
        };
      return query;
    },
  };
  runInNewContext(compiled, {
    Deno: {
      serve: (fn: typeof handler) => {
        handler = fn;
      },
      env: { get: () => 'synthetic-config' },
    },
    createClient: () => admin,
    Buffer,
    Response,
    Date,
    Error,
    RequestError,
    console: { warn: vi.fn(), error: vi.fn() },
    TextEncoder,
    crypto: webcrypto,
    readJsonLimited,
    validateCertificateInput,
    consume,
    limited: (r: any) =>
      r.allowed ? null : new Response('{"error":"Muitas tentativas"}', { status: 429 }),
    AbortSignal,
    fetch: vi.fn().mockResolvedValue(new Response('{"ok":false}', { status: 503 })),
    lerCertificado: () => {
      if (options.badPassword) throw new Error('MAC verify failure');
      return {
        validadeInicio: new Date('2025-01-01'),
        validadeFim: new Date(options.expired ? '2025-02-01' : '2030-01-01'),
        titular: { cnpj: '99999999000191', nome: 'TESTE' },
        serialNumber: 'test',
      };
    },
  });
  return {
    run: (body: unknown) =>
      handler(
        new Request('https://example.test', {
          method: 'POST',
          headers: { Authorization: 'Bearer synthetic' },
          body: JSON.stringify(body),
        })
      ),
    writes,
    rpc,
    consume,
  };
}
const upload = {
  action: 'add_from_certificate',
  certificate_base64: 'AQID',
  certificate_password: 'synthetic-password',
  certificate_name: 'teste.pfx',
};
describe('importação segura do extrator', () => {
  it('nega sessão ausente sem gravar', async () => {
    const b = backend({ noUser: true });
    expect((await b.run(upload)).status).toBe(401);
    expect(b.rpc).not.toHaveBeenCalled();
  });
  it('nega usuário sem conta gerenciável', async () => {
    const b = backend({ denied: true });
    expect((await b.run(upload)).status).toBe(403);
    expect(b.rpc).not.toHaveBeenCalled();
  });
  it('limita antes de analisar o A1', async () => {
    const b = backend({ limited: true });
    expect((await b.run(upload)).status).toBe(429);
    expect(b.rpc).not.toHaveBeenCalled();
  });
  it('senha incorreta retorna 422 sem desativar certificado', async () => {
    const b = backend({ badPassword: true });
    const r = await b.run(upload);
    expect(r.status).toBe(422);
    expect((await r.json()).error).toContain('senha');
    expect(b.writes).not.toHaveBeenCalled();
    expect(b.rpc).not.toHaveBeenCalled();
  });
  it('recusa certificado vencido', async () => {
    const b = backend({ expired: true });
    expect((await b.run(upload)).status).toBe(422);
    expect(b.rpc).not.toHaveBeenCalled();
  });
  it('salva apenas pelo RPC atômico e criptografa o segredo', async () => {
    const b = backend();
    const r = await b.run(upload);
    expect(r.status).toBe(200);
    expect(b.writes).not.toHaveBeenCalled();
    expect(b.rpc).toHaveBeenCalledTimes(1);
    expect(b.rpc.mock.calls[0][0]).toBe('extractor_save_verified_certificate');
    expect(JSON.stringify(b.rpc.mock.calls[0][1])).not.toContain('synthetic-password');
  });
  it('falha de persistência não finge sucesso nem expõe erro interno', async () => {
    const b = backend({ saveError: true });
    const r = await b.run(upload);
    expect(r.status).toBe(500);
    expect(await r.text()).not.toContain('internal-secret');
  });
  it('criptografa A1 grande sem estourar pilha de argumentos', async () => {
    const b = backend();
    expect((await b.run({ ...upload, certificate_base64: 'AAAA'.repeat(50000) })).status).toBe(200);
  });
});
