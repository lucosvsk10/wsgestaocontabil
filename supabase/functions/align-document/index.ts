import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const N8N_WEBHOOK_URL = "https://basilisk-coop-n8n.zmdnad.easypanel.host/webhook/ws-site";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5 * 60 * 1000; // 5 minutes

// ============= FUNÇÕES DE CONVERSÃO DE FORMATO =============

/**
 * Converte data de "DD/MM/YYYY" para "YYYY-MM-DD" (formato ISO)
 */
function convertDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  
  // Se já está no formato ISO (YYYY-MM-DD), retornar como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  // Converter de DD/MM/YYYY para YYYY-MM-DD
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  console.warn(`Invalid date format: ${dateStr}`);
  return null;
}

/**
 * Converte valor de "488,17" (string BR) para 488.17 (number)
 */
function convertValor(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined) return 0;
  if (typeof valor === 'number') return valor;
  
  // Remove pontos de milhar e troca vírgula por ponto
  const cleaned = valor.toString().replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Extrai lançamentos da resposta do n8n independente do formato
 * 
 * Formatos suportados:
 * 1. [{ "documento_alinhado": [...] }] - Array com objeto contendo documento_alinhado
 * 2. [{"data":"03/11/2025",...}, ...] - Array direto de lançamentos
 * 3. { "lancamentos": [...] } - Objeto com chave lancamentos
 * 4. { "documento_alinhado": [...] } - Objeto com chave documento_alinhado
 */
function extractLancamentos(n8nData: any): any[] {
  console.log('=== EXTRACTING LANCAMENTOS ===');
  console.log('Input type:', typeof n8nData);
  console.log('Is array:', Array.isArray(n8nData));
  console.log('Input preview:', JSON.stringify(n8nData).substring(0, 500));
  
  let lancamentos: any[] = [];
  
  // FORMATO 1: Array com objeto contendo documento_alinhado
  // [{ "documento_alinhado": [...] }]
  if (Array.isArray(n8nData) && n8nData.length > 0 && n8nData[0]?.documento_alinhado) {
    console.log('Detected format: Array with documento_alinhado');
    lancamentos = n8nData[0].documento_alinhado;
  }
  // FORMATO 2: Array direto de lançamentos
  // [{"data":"03/11/2025", ...}, ...]
  else if (Array.isArray(n8nData) && n8nData.length > 0 && (n8nData[0]?.data || n8nData[0]?.historico)) {
    console.log('Detected format: Direct array of lancamentos');
    lancamentos = n8nData;
  }
  // FORMATO 3: Objeto com chave lancamentos
  // { "lancamentos": [...] }
  else if (n8nData?.lancamentos && Array.isArray(n8nData.lancamentos)) {
    console.log('Detected format: Object with lancamentos key');
    lancamentos = n8nData.lancamentos;
  }
  // FORMATO 4: Objeto com chave documento_alinhado
  // { "documento_alinhado": [...] }
  else if (n8nData?.documento_alinhado && Array.isArray(n8nData.documento_alinhado)) {
    console.log('Detected format: Object with documento_alinhado key');
    lancamentos = n8nData.documento_alinhado;
  }
  else {
    console.error('Unknown n8n response format!');
    console.error('Keys found:', n8nData ? Object.keys(n8nData) : 'null');
  }
  
  console.log(`Extracted ${lancamentos.length} lancamentos`);
  
  if (lancamentos.length > 0) {
    console.log('First lancamento (raw):', JSON.stringify(lancamentos[0]));
  }
  
  console.log('==============================');
  
  return lancamentos;
}

// ============= FIM FUNÇÕES DE CONVERSÃO =============

// Function to schedule retry
async function scheduleRetry(supabaseUrl: string, supabaseServiceKey: string, documentId: string, delayMs: number) {
  console.log(`Scheduling retry for document ${documentId} in ${delayMs / 1000}s`);
  
  await new Promise(resolve => setTimeout(resolve, delayMs));
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Check if document still needs retry (status might have changed)
  const { data: doc } = await supabase
    .from('documentos_brutos')
    .select('status_alinhamento, tentativas_alinhamento')
    .eq('id', documentId)
    .single();
  
  if (doc?.status_alinhamento === 'aguardando_retry') {
    console.log(`Executing retry for document ${documentId}, attempt ${(doc.tentativas_alinhamento || 0) + 1}`);
    
    // Update status to processando
    await supabase
      .from('documentos_brutos')
      .update({ status_alinhamento: 'processando' })
      .eq('id', documentId);
    
    // Call the alignment function via HTTP (self-invoke)
    try {
      await fetch(`${supabaseUrl}/functions/v1/align-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ document_id: documentId, is_retry: true })
      });
    } catch (error) {
      console.error('Error invoking retry:', error);
    }
  } else {
    console.log(`Document ${documentId} no longer needs retry (status: ${doc?.status_alinhamento})`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { document_id, is_retry } = await req.json();

    console.log(`Starting alignment for document ${document_id}${is_retry ? ' (retry)' : ''}`);

    // Get document data
    const { data: doc, error: docError } = await supabase
      .from('documentos_brutos')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docError || !doc) {
      console.error('Document not found:', docError);
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Only align documents that are already processed (transcribed)
    if (doc.status_processamento !== 'concluido') {
      console.log(`Document ${document_id} not ready for alignment (status: ${doc.status_processamento})`);
      return new Response(JSON.stringify({ error: 'Document not ready for alignment' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const currentAttempt = (doc.tentativas_alinhamento || 0) + 1;
    console.log(`Alignment attempt ${currentAttempt}/${MAX_RETRIES} for document ${document_id}`);

    // Update alignment status to processing
    await supabase
      .from('documentos_brutos')
      .update({ 
        status_alinhamento: 'processando',
        tentativas_alinhamento: currentAttempt
      })
      .eq('id', document_id);

    // Get user info
    const { data: userInfo } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', doc.user_id)
      .single();

    // Get plano de contas (REQUIRED)
    const { data: planoData, error: planoError } = await supabase
      .from('planos_contas')
      .select('conteudo')
      .eq('user_id', doc.user_id)
      .single();

    if (planoError || !planoData) {
      console.error('Plano de contas not found for user:', doc.user_id);
      
      // This is a permanent error - don't retry
      await supabase
        .from('documentos_brutos')
        .update({ 
          status_alinhamento: 'erro',
          ultimo_erro: 'Plano de Contas não cadastrado'
        })
        .eq('id', document_id);

      await supabase
        .from('notifications')
        .insert({
          user_id: doc.user_id,
          message: `Documento ${doc.nome_arquivo} não pode ser alinhado: Plano de Contas não cadastrado. Entre em contato com o escritório.`,
          type: 'erro_alinhamento'
        });

      return new Response(JSON.stringify({ 
        error: 'Plano de contas não cadastrado para este cliente' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found plano de contas for user ${doc.user_id} (${planoData.conteudo.length} chars)`);

    // Send to n8n for AI alignment
    try {
      console.log(`Sending document ${document_id} to n8n for alignment`);
      
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'alinhamento-documento',
          document_id: doc.id,
          user_id: doc.user_id,
          user_name: userInfo?.name,
          user_email: userInfo?.email,
          competencia: doc.competencia,
          tipo_documento: doc.tipo_documento,
          nome_arquivo: doc.nome_arquivo,
          dados_extraidos: doc.dados_extraidos,
          plano_contas: planoData.conteudo,
          timestamp: new Date().toISOString()
        })
      });

      if (!n8nResponse.ok) {
        throw new Error(`n8n returned ${n8nResponse.status}`);
      }

      const n8nData = await n8nResponse.json();
      
      // Log detalhado da resposta do n8n
      console.log('=== n8n RAW RESPONSE ===');
      console.log('Response type:', typeof n8nData);
      console.log('Is array:', Array.isArray(n8nData));
      console.log('Full response:', JSON.stringify(n8nData, null, 2));
      console.log('========================');

      // Extrair lançamentos usando parser multi-formato
      const lancamentos = extractLancamentos(n8nData);

      // Se n8n não retornou lançamentos, marcar como erro
      if (lancamentos.length === 0) {
        console.error(`n8n returned empty lancamentos for document ${document_id}`);
        
        await supabase
          .from('documentos_brutos')
          .update({
            status_alinhamento: 'erro',
            ultimo_erro: 'n8n não retornou lançamentos alinhados. Verifique os dados extraídos do documento.'
          })
          .eq('id', document_id);

        // Notificar usuário sobre o problema
        await supabase
          .from('notifications')
          .insert({
            user_id: doc.user_id,
            message: `Documento ${doc.nome_arquivo}: alinhamento não gerou lançamentos. Verifique se o documento contém dados válidos.`,
            type: 'erro_alinhamento'
          });

        return new Response(JSON.stringify({ 
          success: false, 
          error: 'n8n não retornou lançamentos',
          document_id
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Converter e inserir lançamentos
      const lancamentosToInsert = lancamentos.map((l: any) => {
        const converted = {
          user_id: doc.user_id,
          competencia: doc.competencia,
          documento_origem_id: doc.id,
          data: convertDate(l.data),              // "03/11/2025" → "2025-11-03"
          valor: convertValor(l.valor),           // "488,17" → 488.17
          historico: l.historico,
          debito: String(l.debito || ''),         // 35 → "35"
          credito: String(l.credito || '')        // 2 → "2"
        };
        return converted;
      });

      // Log de debug das conversões
      console.log('=== CONVERSION DEBUG ===');
      console.log(`Converting ${lancamentos.length} lancamentos`);
      if (lancamentosToInsert.length > 0) {
        console.log('First lancamento BEFORE conversion:', JSON.stringify(lancamentos[0]));
        console.log('First lancamento AFTER conversion:', JSON.stringify(lancamentosToInsert[0]));
      }
      console.log('========================');

      console.log(`Inserting ${lancamentosToInsert.length} lancamentos for document ${document_id}`);

      const { error: insertError } = await supabase
        .from('lancamentos_alinhados')
        .insert(lancamentosToInsert);

      if (insertError) {
        console.error('Error inserting lancamentos:', insertError);
        throw insertError;
      }

      console.log(`Successfully inserted ${lancamentos.length} lancamentos for document ${document_id}`);

      // Update document as aligned - SUCCESS!
      await supabase
        .from('documentos_brutos')
        .update({
          status_alinhamento: 'alinhado',
          alinhado_em: new Date().toISOString(),
          ultimo_erro: null
        })
        .eq('id', document_id);

      // Notify user
      await supabase
        .from('notifications')
        .insert({
          user_id: doc.user_id,
          message: `Documento ${doc.nome_arquivo} alinhado com sucesso! ${lancamentos.length} lançamentos processados.`,
          type: 'documento_alinhado'
        });

      return new Response(JSON.stringify({ 
        success: true, 
        document_id,
        lancamentos_count: lancamentos.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (n8nError: any) {
      console.error(`n8n alignment error (attempt ${currentAttempt}/${MAX_RETRIES}):`, n8nError);
      
      // Check if we can retry
      if (currentAttempt < MAX_RETRIES) {
        console.log(`Scheduling retry ${currentAttempt + 1}/${MAX_RETRIES} in 5 minutes`);
        
        // Update status to waiting for retry
        await supabase
          .from('documentos_brutos')
          .update({
            status_alinhamento: 'aguardando_retry',
            ultimo_erro: `Tentativa ${currentAttempt}/${MAX_RETRIES} falhou. Próxima tentativa em 5 minutos.`
          })
          .eq('id', document_id);

        // Schedule retry using background task
        EdgeRuntime.waitUntil(
          scheduleRetry(supabaseUrl, supabaseServiceKey, document_id, RETRY_DELAY_MS)
        );

        return new Response(JSON.stringify({ 
          success: false, 
          error: n8nError.message,
          retry_scheduled: true,
          current_attempt: currentAttempt,
          max_retries: MAX_RETRIES
        }), {
          status: 200, // Return 200 since retry is scheduled
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        // Max retries reached - mark as final error
        console.log(`Max retries (${MAX_RETRIES}) reached for document ${document_id}`);
        
        await supabase
          .from('documentos_brutos')
          .update({
            status_alinhamento: 'erro',
            ultimo_erro: `Falhou após ${MAX_RETRIES} tentativas: ${n8nError.message}`
          })
          .eq('id', document_id);

        // Notify about final error
        await supabase
          .from('notifications')
          .insert({
            user_id: doc.user_id,
            message: `Erro ao alinhar documento ${doc.nome_arquivo} após ${MAX_RETRIES} tentativas. Entre em contato com o suporte.`,
            type: 'erro_alinhamento'
          });

        return new Response(JSON.stringify({ 
          success: false, 
          error: n8nError.message,
          final_error: true,
          attempts: currentAttempt
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
