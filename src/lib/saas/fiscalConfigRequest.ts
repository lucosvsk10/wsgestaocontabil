import { supabase } from '@/integrations/supabase/client';

export async function fiscalConfigRequest(body: Record<string, unknown>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const { data, error } = await supabase.functions.invoke('saas-fiscal-config', {
      body,
      signal: controller.signal,
    });
    if (error) {
      let detail = '';
      try {
        detail = (await error.context?.clone().json())?.error || '';
      } catch {
        /* Non-JSON/network response. */
      }
      if (controller.signal.aborted)
        throw new Error(
          'O servidor demorou a responder. Confira o certificado salvo antes de tentar novamente; o processamento pode ter sido concluído.'
        );
      throw new Error(
        detail ||
          'Não foi possível comunicar com o servidor. Confira sua conexão e tente novamente.'
      );
    }
    if (data?.error) throw new Error(data.error);
    if (!data) throw new Error('O servidor retornou uma resposta vazia. Tente novamente.');
    return data;
  } finally {
    clearTimeout(timer);
  }
}
