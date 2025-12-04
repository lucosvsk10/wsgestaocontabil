import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// n8n webhook URL for verification
const N8N_WEBHOOK_URL = Deno.env.get('N8N_CLOSE_MONTH_WEBHOOK') || '';

// Check if user has admin privileges using user_roles table
const checkIsAdmin = async (supabase: any, userId: string): Promise<boolean> => {
  const { data: roles, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
  
  return roles?.some(r => r.role === 'admin') || false;
};

// Identify and remove duplicate lancamentos
const removeDuplicates = async (supabase: any, userId: string, competencia: string): Promise<number> => {
  // Get all lancamentos for this user/competencia
  const { data: lancamentos, error } = await supabase
    .from('lancamentos_alinhados')
    .select('id, data, valor, historico, debito, credito, created_at')
    .eq('user_id', userId)
    .eq('competencia', competencia)
    .order('created_at', { ascending: true });

  if (error || !lancamentos) return 0;

  // Find duplicates based on (data, valor, historico, debito, credito)
  const seen = new Map<string, string>();
  const duplicateIds: string[] = [];

  for (const l of lancamentos) {
    const key = `${l.data}|${l.valor}|${l.historico}|${l.debito}|${l.credito}`;
    if (seen.has(key)) {
      duplicateIds.push(l.id);
    } else {
      seen.set(key, l.id);
    }
  }

  if (duplicateIds.length > 0) {
    console.log(`Removing ${duplicateIds.length} duplicate lancamentos`);
    const { error: deleteError } = await supabase
      .from('lancamentos_alinhados')
      .delete()
      .in('id', duplicateIds);
    
    if (deleteError) {
      console.error('Error deleting duplicates:', deleteError);
      return 0;
    }
  }

  return duplicateIds.length;
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
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 12 },  // Data
    { wch: 15 },  // Valor
    { wch: 50 },  // Histórico
    { wch: 15 },  // Débito
    { wch: 15 }   // Crédito
  ];
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Lançamentos');
  
  const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(excelBuffer);
};

// Send to n8n for verification
const sendToN8nForVerification = async (userId: string, competencia: string, lancamentos: any[]): Promise<{ success: boolean; correctedData?: any[]; error?: string }> => {
  if (!N8N_WEBHOOK_URL) {
    console.log('N8N_CLOSE_MONTH_WEBHOOK not configured, skipping n8n verification');
    return { success: true };
  }

  try {
    console.log(`Sending ${lancamentos.length} lancamentos to n8n for verification`);
    
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'verificacao-fechamento',
        user_id: userId,
        competencia,
        lancamentos,
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/receive-n8n-response`
      })
    });

    if (!response.ok) {
      console.error('n8n returned error:', response.status);
      return { success: false, error: `n8n returned status ${response.status}` };
    }

    const result = await response.json();
    console.log('n8n verification response:', result);

    // If n8n returns corrected data, use it
    if (result.corrected_lancamentos && Array.isArray(result.corrected_lancamentos)) {
      return { 
        success: true, 
        correctedData: result.corrected_lancamentos 
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending to n8n:', error);
    return { success: false, error: error.message };
  }
};

// Apply corrected data from n8n
const applyCorrectedData = async (supabase: any, userId: string, competencia: string, correctedData: any[]): Promise<number> => {
  // Delete existing lancamentos for this period
  const { error: deleteError } = await supabase
    .from('lancamentos_alinhados')
    .delete()
    .eq('user_id', userId)
    .eq('competencia', competencia);

  if (deleteError) {
    console.error('Error deleting old lancamentos:', deleteError);
    throw new Error('Erro ao limpar lançamentos antigos');
  }

  // Insert corrected lancamentos
  const lancamentosToInsert = correctedData.map(l => ({
    user_id: userId,
    competencia,
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
    throw new Error('Erro ao inserir lançamentos corrigidos');
  }

  console.log(`Applied ${correctedData.length} corrected lancamentos from n8n`);
  return correctedData.length;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Authorization header to verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify the calling user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !callingUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if calling user is admin
    const isAdmin = await checkIsAdmin(supabase, callingUser.id);

    if (!isAdmin) {
      console.log(`User ${callingUser.email} attempted to close month but is not admin`);
      return new Response(JSON.stringify({ error: 'Apenas administradores podem fechar meses' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { user_id, competencia, format = 'csv', skip_n8n_verification = false } = await req.json();

    console.log(`Admin ${callingUser.email} closing month ${competencia} for user ${user_id} with format ${format}`);

    // Get user info
    const { data: userInfo } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', user_id)
      .single();

    // Check if already closed
    const { data: existingFechamento } = await supabase
      .from('fechamentos_exportados')
      .select('id')
      .eq('user_id', user_id)
      .eq('competencia', competencia)
      .single();

    if (existingFechamento) {
      return new Response(JSON.stringify({ error: 'Mês já foi fechado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check for unprocessed documents
    const { data: pendingDocs, error: pendingError } = await supabase
      .from('documentos_brutos')
      .select('id, nome_arquivo, status_processamento')
      .eq('user_id', user_id)
      .eq('competencia', competencia)
      .in('status_processamento', ['nao_processado', 'processando']);

    if (pendingError) {
      console.error('Error checking pending docs:', pendingError);
    }

    if (pendingDocs && pendingDocs.length > 0) {
      return new Response(JSON.stringify({ 
        error: 'Existem documentos pendentes de processamento',
        pending_docs: pendingDocs.map(d => ({ id: d.id, nome: d.nome_arquivo, status: d.status_processamento }))
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get all aligned lancamentos for verification
    let { data: lancamentos, error: lancError } = await supabase
      .from('lancamentos_alinhados')
      .select('*')
      .eq('user_id', user_id)
      .eq('competencia', competencia)
      .order('data', { ascending: true });

    if (lancError) {
      console.error('Error fetching lancamentos:', lancError);
      throw lancError;
    }

    if (!lancamentos || lancamentos.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum lançamento alinhado para fechar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${lancamentos.length} lancamentos for closing`);

    // Send to n8n for verification (if configured)
    let duplicatesRemoved = 0;
    let n8nVerificationResult = { success: true, correctedData: undefined as any[] | undefined };
    
    if (!skip_n8n_verification && N8N_WEBHOOK_URL) {
      n8nVerificationResult = await sendToN8nForVerification(user_id, competencia, lancamentos);
      
      if (!n8nVerificationResult.success) {
        console.log('n8n verification failed, proceeding with local duplicate removal');
      }

      // If n8n returned corrected data, apply it
      if (n8nVerificationResult.correctedData && n8nVerificationResult.correctedData.length > 0) {
        console.log('Applying corrected data from n8n');
        await applyCorrectedData(supabase, user_id, competencia, n8nVerificationResult.correctedData);
        
        // Re-fetch lancamentos after correction
        const { data: updatedLancamentos } = await supabase
          .from('lancamentos_alinhados')
          .select('*')
          .eq('user_id', user_id)
          .eq('competencia', competencia)
          .order('data', { ascending: true });
        
        lancamentos = updatedLancamentos || [];
        duplicatesRemoved = n8nVerificationResult.correctedData.length - lancamentos.length;
      }
    }
    
    // If n8n didn't correct, do local duplicate removal
    if (!n8nVerificationResult.correctedData) {
      duplicatesRemoved = await removeDuplicates(supabase, user_id, competencia);
      console.log(`Removed ${duplicatesRemoved} duplicate lancamentos locally`);

      // Re-fetch lancamentos after duplicate removal
      const { data: updatedLancamentos } = await supabase
        .from('lancamentos_alinhados')
        .select('*')
        .eq('user_id', user_id)
        .eq('competencia', competencia)
        .order('data', { ascending: true });
      
      lancamentos = updatedLancamentos || [];
    }

    // Store file paths for signed URL generation
    let csvFilePath = null;
    let excelFilePath = null;

    // Generate CSV (always generate for backup)
    const csvContent = generateCSV(lancamentos);
    const csvFileName = `${user_id}/${competencia}/lancamentos_${competencia}.csv`;
    
    const { error: csvUploadError } = await supabase.storage
      .from('lancamentos')
      .upload(csvFileName, csvContent, {
        contentType: 'text/csv',
        upsert: true
      });

    if (csvUploadError) {
      console.error('Error uploading CSV:', csvUploadError);
    } else {
      csvFilePath = csvFileName;
    }

    // Generate Excel if requested
    if (format === 'excel' || format === 'all') {
      try {
        const excelBuffer = generateExcel(lancamentos);
        const excelFileName = `${user_id}/${competencia}/lancamentos_${competencia}.xlsx`;
        
        const { error: excelUploadError } = await supabase.storage
          .from('lancamentos')
          .upload(excelFileName, excelBuffer, {
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            upsert: true
          });

        if (excelUploadError) {
          console.error('Error uploading Excel:', excelUploadError);
        } else {
          excelFilePath = excelFileName;
        }
      } catch (excelError) {
        console.error('Error generating Excel:', excelError);
      }
    }

    // Generate signed URLs for download (valid for 7 days)
    let csvSignedUrl = null;
    let excelSignedUrl = null;

    if (csvFilePath) {
      const { data: csvUrlData, error: csvSignError } = await supabase.storage
        .from('lancamentos')
        .createSignedUrl(csvFilePath, 604800); // 7 days
      
      if (!csvSignError && csvUrlData) {
        csvSignedUrl = csvUrlData.signedUrl;
      }
    }

    if (excelFilePath) {
      const { data: excelUrlData, error: excelSignError } = await supabase.storage
        .from('lancamentos')
        .createSignedUrl(excelFilePath, 604800); // 7 days
      
      if (!excelSignError && excelUrlData) {
        excelSignedUrl = excelUrlData.signedUrl;
      }
    }

    // Create fechamento record with file paths (not signed URLs, as they expire)
    const { data: fechamento, error: fechError } = await supabase
      .from('fechamentos_exportados')
      .insert({
        user_id,
        user_name: userInfo?.name,
        user_email: userInfo?.email,
        competencia,
        status: 'concluido',
        total_lancamentos: lancamentos.length,
        arquivo_csv_url: csvFilePath, // Store path, not signed URL
        arquivo_excel_url: excelFilePath // Store path, not signed URL
      })
      .select()
      .single();

    if (fechError) {
      console.error('Error creating fechamento:', fechError);
      throw fechError;
    }

    // Record in month_closures
    await supabase
      .from('month_closures')
      .insert({
        user_id,
        user_name: userInfo?.name || '',
        user_email: userInfo?.email || '',
        month: competencia.split('-')[1],
        year: parseInt(competencia.split('-')[0]),
        status: 'fechado'
      });

    // Notify user
    await supabase
      .from('notifications')
      .insert({
        user_id,
        message: `Mês ${competencia} fechado com sucesso! ${lancamentos.length} lançamentos exportados.`,
        type: 'mes_fechado'
      });

    console.log(`Month ${competencia} closed successfully with ${lancamentos.length} lancamentos, ${duplicatesRemoved} duplicates removed`);

    return new Response(JSON.stringify({ 
      success: true, 
      fechamento_id: fechamento.id,
      total_lancamentos: lancamentos.length,
      duplicates_removed: duplicatesRemoved,
      csv_url: csvSignedUrl,
      excel_url: excelSignedUrl,
      csv_path: csvFilePath,
      excel_path: excelFilePath,
      n8n_verified: !!n8nVerificationResult.correctedData
    }), {
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
