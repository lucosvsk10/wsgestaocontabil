import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate CSV content
const generateCSV = (lancamentos: any[]): string => {
  const csvHeader = 'Data,Valor,Historico,Debito,Credito\n';
  const csvContent = csvHeader + lancamentos.map((l: any) => 
    `${l.data || ''},${l.valor || ''},${(l.historico || '').replace(/,/g, ';').replace(/\n/g, ' ')},${l.debito || ''},${l.credito || ''}`
  ).join('\n');
  return csvContent;
};

// Generate Excel buffer
const generateExcel = (lancamentos: any[]): Uint8Array => {
  const worksheetData = lancamentos.map((l: any) => ({
    'Data': l.data || '',
    'Valor': l.valor || 0,
    'Histórico': l.historico || '',
    'Débito': l.debito || '',
    'Crédito': l.credito || ''
  }));
  
  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 15 },
    { wch: 50 },
    { wch: 15 },
    { wch: 15 }
  ];
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Lançamentos');
  
  const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(excelBuffer);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { document_id, success, extracted_data, error_message, event } = body;

    console.log(`Received n8n response:`, { event, document_id, success });

    if (event === 'arquivos-brutos') {
      if (success) {
        await supabase
          .from('documentos_brutos')
          .update({
            status_processamento: 'concluido',
            processado_em: new Date().toISOString(),
            dados_extraidos: extracted_data,
            tentativas_processamento: 0
          })
          .eq('id', document_id);

        console.log(`Document ${document_id} marked as processed`);

      } else {
        const { data: doc } = await supabase
          .from('documentos_brutos')
          .select('tentativas_processamento, user_id, nome_arquivo')
          .eq('id', document_id)
          .single();

        const currentRetries = (doc?.tentativas_processamento || 0) + 1;

        if (currentRetries >= 5) {
          await supabase
            .from('documentos_brutos')
            .update({
              status_processamento: 'erro',
              tentativas_processamento: currentRetries,
              ultimo_erro: error_message || 'Erro no processamento n8n'
            })
            .eq('id', document_id);

          if (doc?.user_id) {
            await supabase
              .from('notifications')
              .insert({
                user_id: doc.user_id,
                message: `Erro no processamento do arquivo: ${doc.nome_arquivo}`,
                type: 'erro_processamento'
              });
          }
        } else {
          await supabase
            .from('documentos_brutos')
            .update({
              status_processamento: 'pendente',
              tentativas_processamento: currentRetries,
              ultimo_erro: error_message || 'Erro temporário'
            })
            .eq('id', document_id);
        }
      }
    } else if (event === 'alinhamento-documento') {
      const { lancamentos, user_id, competencia } = body;
      
      console.log(`Received alignment response for document ${document_id}`);

      if (success && lancamentos && lancamentos.length > 0) {
        const lancamentosToInsert = lancamentos.map((l: any) => ({
          user_id,
          competencia,
          documento_origem_id: document_id,
          data: l.data,
          valor: l.valor,
          historico: l.historico,
          debito: l.debito,
          credito: l.credito
        }));

        const { error: insertError } = await supabase
          .from('lancamentos_alinhados')
          .insert(lancamentosToInsert);

        if (insertError) {
          console.error('Error inserting lancamentos:', insertError);
        } else {
          console.log(`Inserted ${lancamentos.length} lancamentos for document ${document_id}`);
          
          await supabase
            .from('notifications')
            .insert({
              user_id,
              message: `Documento alinhado com sucesso! ${lancamentos.length} lançamentos processados.`,
              type: 'documento_alinhado'
            });
        }
      } else if (!success) {
        console.error(`Alignment failed for document ${document_id}:`, error_message);
      }
    } else if (event === 'verificacao-fechamento') {
      // Handle month closing verification response from n8n
      const { 
        verification_id, 
        user_id, 
        competencia, 
        corrected_lancamentos, 
        duplicates_removed,
        format = 'excel'
      } = body;
      
      console.log(`Received verification response: verification_id=${verification_id}, user_id=${user_id}, competencia=${competencia}`);

      // Get the fechamento record
      const { data: fechamento, error: fetchError } = await supabase
        .from('fechamentos_exportados')
        .select('*')
        .eq('verification_id', verification_id)
        .single();

      if (fetchError || !fechamento) {
        console.error('Fechamento not found for verification_id:', verification_id);
        return new Response(JSON.stringify({ 
          received: true, 
          error: 'Fechamento não encontrado' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!success) {
        console.error(`Verification failed:`, error_message);
        
        await supabase
          .from('fechamentos_exportados')
          .update({ n8n_status: 'erro' })
          .eq('verification_id', verification_id);

        await supabase
          .from('notifications')
          .insert({
            user_id: fechamento.user_id,
            message: `Erro na verificação do fechamento: ${error_message || 'Erro desconhecido'}`,
            type: 'erro_verificacao'
          });

        return new Response(JSON.stringify({ received: true, error: error_message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Apply corrected lancamentos if provided
      if (corrected_lancamentos && Array.isArray(corrected_lancamentos) && corrected_lancamentos.length > 0) {
        // Delete existing lancamentos for this period
        const { error: deleteError } = await supabase
          .from('lancamentos_alinhados')
          .delete()
          .eq('user_id', fechamento.user_id)
          .eq('competencia', fechamento.competencia);

        if (deleteError) {
          console.error('Error deleting old lancamentos:', deleteError);
          
          await supabase
            .from('fechamentos_exportados')
            .update({ n8n_status: 'erro' })
            .eq('verification_id', verification_id);

          return new Response(JSON.stringify({ 
            received: true, 
            error: 'Erro ao limpar lançamentos antigos' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Insert corrected lancamentos
        const lancamentosToInsert = corrected_lancamentos.map((l: any) => ({
          user_id: fechamento.user_id,
          competencia: fechamento.competencia,
          data: l.data,
          valor: l.valor,
          historico: l.historico,
          debito: l.debito,
          credito: l.credito,
          documento_origem_id: l.documento_origem_id || null
        }));

        const { error: insertError } = await supabase
          .from('lancamentos_alinhados')
          .insert(lancamentosToInsert);

        if (insertError) {
          console.error('Error inserting corrected lancamentos:', insertError);
        } else {
          console.log(`Applied ${corrected_lancamentos.length} corrected lancamentos`);
        }
      }

      // Get final lancamentos
      const { data: lancamentos } = await supabase
        .from('lancamentos_alinhados')
        .select('*')
        .eq('user_id', fechamento.user_id)
        .eq('competencia', fechamento.competencia)
        .order('data', { ascending: true });

      if (!lancamentos || lancamentos.length === 0) {
        await supabase
          .from('fechamentos_exportados')
          .update({ n8n_status: 'erro' })
          .eq('verification_id', verification_id);

        return new Response(JSON.stringify({ 
          received: true, 
          error: 'Nenhum lançamento após verificação' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Generate files
      let csvFilePath = null;
      let excelFilePath = null;

      const csvContent = generateCSV(lancamentos);
      const csvFileName = `${fechamento.user_id}/${fechamento.competencia}/lancamentos_${fechamento.competencia}.csv`;
      
      const { error: csvUploadError } = await supabase.storage
        .from('lancamentos')
        .upload(csvFileName, csvContent, {
          contentType: 'text/csv',
          upsert: true
        });

      if (!csvUploadError) {
        csvFilePath = csvFileName;
      } else {
        console.error('Error uploading CSV:', csvUploadError);
      }

      if (format === 'excel' || format === 'all') {
        try {
          const excelBuffer = generateExcel(lancamentos);
          const excelFileName = `${fechamento.user_id}/${fechamento.competencia}/lancamentos_${fechamento.competencia}.xlsx`;
          
          const { error: excelUploadError } = await supabase.storage
            .from('lancamentos')
            .upload(excelFileName, excelBuffer, {
              contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              upsert: true
            });

          if (!excelUploadError) {
            excelFilePath = excelFileName;
          } else {
            console.error('Error uploading Excel:', excelUploadError);
          }
        } catch (excelError) {
          console.error('Error generating Excel:', excelError);
        }
      }

      // Update fechamento record
      const { error: updateError } = await supabase
        .from('fechamentos_exportados')
        .update({
          n8n_status: 'concluido',
          status: 'concluido',
          total_lancamentos: lancamentos.length,
          arquivo_csv_url: csvFilePath,
          arquivo_excel_url: excelFilePath
        })
        .eq('verification_id', verification_id);

      if (updateError) {
        console.error('Error updating fechamento:', updateError);
      }

      // Record in month_closures
      await supabase
        .from('month_closures')
        .insert({
          user_id: fechamento.user_id,
          user_name: fechamento.user_name || '',
          user_email: fechamento.user_email || '',
          month: fechamento.competencia.split('-')[1],
          year: parseInt(fechamento.competencia.split('-')[0]),
          status: 'fechado'
        });

      // Notify user
      const duplicatesMsg = duplicates_removed > 0 ? ` ${duplicates_removed} duplicata(s) removida(s).` : '';
      await supabase
        .from('notifications')
        .insert({
          user_id: fechamento.user_id,
          message: `Mês ${fechamento.competencia} fechado com sucesso! ${lancamentos.length} lançamentos exportados.${duplicatesMsg} (Verificado pelo n8n)`,
          type: 'mes_fechado'
        });

      console.log(`Month closing completed via n8n callback: ${fechamento.user_id}, ${fechamento.competencia}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
