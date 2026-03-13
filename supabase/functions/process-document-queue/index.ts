import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const N8N_WEBHOOK_URL = "https://studiolx-n8n.oi0tyg.easypanel.host/webhook/ws-site";
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 10 * 60 * 1000;
const SIGNED_URL_EXPIRY = 3600;

// ============= FUNÇÕES DE CONVERSÃO (copiadas do align-document) =============

function convertDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  console.warn(`Invalid date format: ${dateStr}`);
  return null;
}

function convertValor(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined) return 0;
  if (typeof valor === 'number') return valor;
  const cleaned = valor.toString().replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function extractLancamentos(n8nData: any): any[] {
  console.log('=== EXTRACTING LANCAMENTOS ===');
  console.log('Input type:', typeof n8nData);
  console.log('Is array:', Array.isArray(n8nData));
  console.log('Input preview:', JSON.stringify(n8nData).substring(0, 500));

  let lancamentos: any[] = [];

  if (Array.isArray(n8nData) && n8nData.length > 0 && n8nData[0]?.documento_alinhado) {
    lancamentos = n8nData[0].documento_alinhado;
  } else if (Array.isArray(n8nData) && n8nData.length > 0 && (n8nData[0]?.data || n8nData[0]?.historico)) {
    lancamentos = n8nData;
  } else if (n8nData?.lancamentos && Array.isArray(n8nData.lancamentos)) {
    lancamentos = n8nData.lancamentos;
  } else if (n8nData?.documento_alinhado && Array.isArray(n8nData.documento_alinhado)) {
    lancamentos = n8nData.documento_alinhado;
  } else {
    console.error('Unknown n8n response format!');
    console.error('Keys found:', n8nData ? Object.keys(n8nData) : 'null');
  }

  console.log(`Extracted ${lancamentos.length} lancamentos`);
  if (lancamentos.length > 0) {
    console.log('First lancamento (raw):', JSON.stringify(lancamentos[0]));
  }
  return lancamentos;
}

// ============= FIM FUNÇÕES DE CONVERSÃO =============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, competencia, file_url, file_name, event, document_id } = await req.json();

    console.log(`Processing document: ${file_name} for user ${user_id}`);

    // Find or validate document
    let docId = document_id;
    let storagePath = file_url;

    if (!docId) {
      const { data: doc, error: docError } = await supabase
        .from('documentos_brutos')
        .select('id, url_storage, tentativas_processamento')
        .eq('user_id', user_id)
        .eq('competencia', competencia)
        .eq('url_storage', file_url)
        .single();

      if (docError) {
        console.error('Error finding document:', docError);
        return new Response(JSON.stringify({ error: 'Document not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      docId = doc.id;
      storagePath = doc.url_storage;
    } else {
      const { data: doc, error: docError } = await supabase
        .from('documentos_brutos')
        .select('url_storage')
        .eq('id', docId)
        .single();

      if (docError) {
        return new Response(JSON.stringify({ error: 'Document not found for retry' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      storagePath = doc.url_storage;
    }

    // Generate signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('lancamentos')
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

    if (signedUrlError) {
      console.error('Error generating signed URL:', signedUrlError);
      return new Response(JSON.stringify({ error: 'Failed to generate signed URL' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const freshSignedUrl = signedUrlData.signedUrl;
    const ext = (file_name || '').split('.').pop()?.toLowerCase() || '';
    const isPdf = ext === 'pdf';

    // Parse tabular file content
    let fileContent: string | null = null;
    if (['xlsx', 'xls', 'csv', 'xml'].includes(ext)) {
      console.log(`Tabular file detected (${ext}), downloading and parsing...`);
      try {
        const { data: fileData, error: dlError } = await supabase.storage
          .from('lancamentos')
          .download(storagePath);

        if (dlError) {
          console.error('Error downloading file for parsing:', dlError);
        } else if (fileData) {
          if (ext === 'csv' || ext === 'xml') {
            fileContent = await fileData.text();
          } else {
            const buffer = await fileData.arrayBuffer();
            const workbook = XLSX.read(new Uint8Array(buffer));
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            fileContent = JSON.stringify(XLSX.utils.sheet_to_json(firstSheet));
          }
          console.log(`Parsed ${ext} content: ${fileContent?.length || 0} chars`);
        }
      } catch (parseErr: any) {
        console.error(`Error parsing ${ext} file:`, parseErr);
      }
    }

    // Update status to processing
    await supabase
      .from('documentos_brutos')
      .update({ status_processamento: 'processando' })
      .eq('id', docId);

    // ===== STEP 1: Send to n8n for extraction =====
    try {
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: event || 'arquivos-brutos',
          document_id: docId,
          user_id,
          competencia,
          file_url: freshSignedUrl,
          file_content: fileContent,
          file_type: ext,
          storage_path: storagePath,
          file_name,
          timestamp: new Date().toISOString()
        })
      });

      if (!n8nResponse.ok) {
        throw new Error(`n8n returned ${n8nResponse.status}`);
      }

      const n8nData = await n8nResponse.json();
      console.log('n8n extraction response:', JSON.stringify(n8nData).substring(0, 500));

      const dadosExtraidos = n8nData.extracted_data || n8nData.text || n8nData.content || n8nData;

      // Save extraction result
      await supabase
        .from('documentos_brutos')
        .update({
          status_processamento: 'concluido',
          processado_em: new Date().toISOString(),
          dados_extraidos: dadosExtraidos,
          tipo_documento: isPdf ? 'pdf' : undefined,
          tentativas_processamento: 0,
          status_alinhamento: 'pendente'
        })
        .eq('id', docId);

      // ===== STEP 2: PDF — immediate alignment (no delay) =====
      if (isPdf) {
        console.log(`PDF detected — starting IMMEDIATE alignment for document ${docId}`);

        // Get plano de contas
        const { data: planoData, error: planoError } = await supabase
          .from('planos_contas')
          .select('conteudo')
          .eq('user_id', user_id)
          .single();

        if (planoError || !planoData) {
          console.error('Plano de contas not found for user:', user_id);
          await supabase
            .from('documentos_brutos')
            .update({
              status_alinhamento: 'erro',
              ultimo_erro: 'Plano de Contas não cadastrado'
            })
            .eq('id', docId);

          await supabase
            .from('notifications')
            .insert({
              user_id,
              message: `Documento ${file_name} não pode ser alinhado: Plano de Contas não cadastrado.`,
              type: 'erro_alinhamento'
            });

          return new Response(JSON.stringify({ success: true, extraction: true, alignment: false, reason: 'no_plano_contas' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Get user info
        const { data: userInfo } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', user_id)
          .single();

        // Generate fresh signed URL for alignment
        const { data: alignSignedUrl } = await supabase.storage
          .from('lancamentos')
          .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

        // Update status
        await supabase
          .from('documentos_brutos')
          .update({ status_alinhamento: 'processando', tentativas_alinhamento: 1 })
          .eq('id', docId);

        // Send to n8n for alignment IMMEDIATELY
        console.log(`Sending PDF alignment request to n8n for document ${docId}`);
        const alignResponse = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'alinhamento-documento',
            document_id: docId,
            user_id,
            user_name: userInfo?.name,
            user_email: userInfo?.email,
            competencia,
            tipo_documento: 'pdf',
            nome_arquivo: file_name,
            dados_extraidos: dadosExtraidos,
            file_url: alignSignedUrl?.signedUrl || freshSignedUrl,
            file_type: 'pdf',
            plano_contas: planoData.conteudo,
            timestamp: new Date().toISOString()
          })
        });

        if (!alignResponse.ok) {
          throw new Error(`n8n alignment returned ${alignResponse.status}`);
        }

        const alignData = await alignResponse.json();
        console.log('n8n alignment response:', JSON.stringify(alignData).substring(0, 500));

        // Extract and insert lançamentos
        const lancamentos = extractLancamentos(alignData);

        if (lancamentos.length === 0) {
          console.error(`Alignment returned 0 lancamentos for document ${docId}`);
          await supabase
            .from('documentos_brutos')
            .update({
              status_alinhamento: 'erro',
              ultimo_erro: 'n8n não retornou lançamentos alinhados'
            })
            .eq('id', docId);

          await supabase
            .from('notifications')
            .insert({
              user_id,
              message: `Documento ${file_name}: alinhamento não gerou lançamentos.`,
              type: 'erro_alinhamento'
            });

          return new Response(JSON.stringify({ success: true, extraction: true, alignment: false, reason: 'no_lancamentos' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Convert and insert
        const lancamentosToInsert = lancamentos.map((l: any) => ({
          user_id,
          competencia,
          documento_origem_id: docId,
          data: convertDate(l.data),
          valor: convertValor(l.valor),
          historico: l.historico,
          debito: String(l.debito || ''),
          credito: String(l.credito || '')
        }));

        console.log(`Inserting ${lancamentosToInsert.length} lancamentos for PDF ${docId}`);
        const { error: insertError } = await supabase
          .from('lancamentos_alinhados')
          .insert(lancamentosToInsert);

        if (insertError) {
          console.error('Error inserting lancamentos:', insertError);
          throw insertError;
        }

        // Mark as fully aligned
        await supabase
          .from('documentos_brutos')
          .update({
            status_alinhamento: 'alinhado',
            alinhado_em: new Date().toISOString(),
            ultimo_erro: null
          })
          .eq('id', docId);

        await supabase
          .from('notifications')
          .insert({
            user_id,
            message: `Documento ${file_name} alinhado com sucesso! ${lancamentos.length} lançamentos processados.`,
            type: 'documento_alinhado'
          });

        console.log(`PDF ${docId} fully processed and aligned: ${lancamentos.length} lancamentos`);

        return new Response(JSON.stringify({
          success: true,
          extraction: true,
          alignment: true,
          lancamentos_count: lancamentos.length
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } else {
        // ===== Non-PDF: keep existing flow with delayed align-document call =====
        console.log(`Non-PDF (${ext}) — scheduling alignment via align-document in 20s`);

        EdgeRuntime.waitUntil(
          new Promise(resolve => {
            setTimeout(async () => {
              try {
                console.log(`Triggering alignment for non-PDF document ${docId}`);
                await fetch(`${supabaseUrl}/functions/v1/align-document`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseServiceKey}`
                  },
                  body: JSON.stringify({ document_id: docId })
                });
              } catch (e) {
                console.error('Error triggering alignment:', e);
              }
              resolve(true);
            }, 20000);
          })
        );

        return new Response(JSON.stringify({ success: true, data: n8nData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

    } catch (n8nError: any) {
      console.error('n8n error:', n8nError);

      const { data: currentDoc } = await supabase
        .from('documentos_brutos')
        .select('tentativas_processamento')
        .eq('id', docId)
        .single();

      const currentRetries = (currentDoc?.tentativas_processamento || 0) + 1;

      if (currentRetries >= MAX_RETRIES) {
        await supabase
          .from('documentos_brutos')
          .update({
            status_processamento: 'erro',
            tentativas_processamento: currentRetries,
            ultimo_erro: `Falha após ${MAX_RETRIES} tentativas: ${n8nError.message}`
          })
          .eq('id', docId);

        await supabase
          .from('notifications')
          .insert([{
            user_id,
            message: `Erro no processamento do arquivo: ${file_name}. Entre em contato com o suporte.`,
            type: 'erro_processamento'
          }]);

        return new Response(JSON.stringify({ success: false, error: 'Max retries reached', document_id: docId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        await supabase
          .from('documentos_brutos')
          .update({
            status_processamento: 'nao_processado',
            tentativas_processamento: currentRetries,
            ultimo_erro: `Tentativa ${currentRetries}/${MAX_RETRIES}: ${n8nError.message}`
          })
          .eq('id', docId);

        EdgeRuntime.waitUntil(
          new Promise(resolve => {
            setTimeout(async () => {
              try {
                await fetch(`${supabaseUrl}/functions/v1/process-document-queue`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseServiceKey}`
                  },
                  body: JSON.stringify({ user_id, competencia, file_url, file_name, event, document_id: docId })
                });
              } catch (e) {
                console.error('Retry scheduling error:', e);
              }
              resolve(true);
            }, RETRY_DELAY_MS);
          })
        );

        return new Response(JSON.stringify({ success: false, retrying: true, attempt: currentRetries, document_id: docId }), {
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
