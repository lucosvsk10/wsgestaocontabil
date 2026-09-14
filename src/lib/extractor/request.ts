import { supabase } from '@/integrations/supabase/client';

export async function extractorErrorMessage(error: { context?: Response }) {
  try {
    const body = await error.context?.clone().json();
    if (typeof body?.error === 'string') return body.error;
  } catch {
    /* Non-JSON transport failure */
  }
  return 'Não foi possível concluir a solicitação. Confira a conexão e tente novamente.';
}

export async function extractorRequest(body: Record<string, unknown>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const { data, error } = await supabase.functions.invoke('extractor-company-config', {
      body,
      signal: controller.signal,
    } as Parameters<typeof supabase.functions.invoke>[1]);
    if (error) {
      let detail = '';
      try {
        detail = (await error.context?.clone().json())?.error || '';
      } catch {
        /* Network or non-JSON response */
      }
      if (controller.signal.aborted)
        throw new Error(
          'A resposta demorou. Confira a lista de empresas antes de repetir: o cadastro pode ter sido concluído.'
        );
      throw new Error(
        detail || 'Não foi possível conectar. Confira sua conexão e tente novamente.'
      );
    }
    if (!data?.ok) throw new Error(data?.error || 'O servidor não confirmou o salvamento.');
    return data;
  } finally {
    clearTimeout(timer);
  }
}
