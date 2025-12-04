import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { user_id, competencia, format = 'csv' } = await req.json();

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

    // Remove duplicates before export
    const duplicatesRemoved = await removeDuplicates(supabase, user_id, competencia);
    console.log(`Removed ${duplicatesRemoved} duplicate lancamentos`);

    // Get all aligned lancamentos for this month (after removing duplicates)
    const { data: lancamentos, error: lancError } = await supabase
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

    let csvUrl = null;
    let excelUrl = null;

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
      const { data: csvUrlData } = supabase.storage
        .from('lancamentos')
        .getPublicUrl(csvFileName);
      csvUrl = csvUrlData.publicUrl;
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
          const { data: excelUrlData } = supabase.storage
            .from('lancamentos')
            .getPublicUrl(excelFileName);
          excelUrl = excelUrlData.publicUrl;
        }
      } catch (excelError) {
        console.error('Error generating Excel:', excelError);
      }
    }

    // Create fechamento record
    const { data: fechamento, error: fechError } = await supabase
      .from('fechamentos_exportados')
      .insert({
        user_id,
        user_name: userInfo?.name,
        user_email: userInfo?.email,
        competencia,
        status: 'concluido',
        total_lancamentos: lancamentos.length,
        arquivo_csv_url: csvUrl,
        arquivo_excel_url: excelUrl
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
      csv_url: csvUrl,
      excel_url: excelUrl
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
