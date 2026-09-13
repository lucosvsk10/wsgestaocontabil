import { describe, it, expect, vi, afterEach } from 'vitest';
import { fiscalConfigRequest } from './fiscalConfigRequest';
import { supabase } from '@/integrations/supabase/client';
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: vi.fn() } } }));
afterEach(() => vi.clearAllMocks());
describe('erros de configuração fiscal', () => {
  it('lê a mensagem real do HTTP 422', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: {
        context: new Response(JSON.stringify({ error: 'Este A1 pertence a outro CNPJ.' }), {
          status: 422,
        }),
      },
    } as never);
    await expect(fiscalConfigRequest({ action: 'get' })).rejects.toThrow('outro CNPJ');
  });
  it('resposta não JSON resulta em erro amigável', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { context: new Response('unavailable', { status: 503 }) },
    } as never);
    await expect(fiscalConfigRequest({ action: 'get' })).rejects.toThrow('conexão');
  });
});
