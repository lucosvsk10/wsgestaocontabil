import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// n8n webhook URL for verification
const N8N_WEBHOOK_URL = "https://basilisk-coop-n8n.zmdnad.easypanel.host/webhook/ws-site";

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
  const { data: lancamentos, error } = await supabase
    .from('lancamentos_alinhados')
    .select('id, data, valor, historico, debito, credito, created_at')
    .eq('user_id', userId)
    .eq('competencia', competencia)
    .order('created_at', { ascending: true });

  if (error || !lancamentos) return 0;

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

// Build plano de contas map
const buildPlanoContasMap = (conteudo: string): Record<string, string> => {
  try {
    const parsed = JSON.parse(conteudo);
    const map: Record<string, string> = {};
    const items = Array.isArray(parsed) && parsed[0]?.data ? parsed[0].data : (Array.isArray(parsed) ? parsed : []);
    for (const item of items) {
      const code = String(item['Codigo reduzido'] || item['codigo_reduzido'] || '');
      const desc = item['Descrição'] || item['descricao'] || item['Descrição da conta'] || '';
      if (code) map[code] = desc;
    }
    return map;
  } catch {
    return {};
  }
};

// Group lancamentos by debit account
const groupByAccount = (lancamentos: any[], planoMap: Record<string, string>) => {
  const groups: Record<string, { conta: string; descricao: string; items: any[] }> = {};
  for (const l of lancamentos) {
    const key = l.debito || 'sem-conta';
    if (!groups[key]) {
      groups[key] = { conta: l.debito || 'Sem conta', descricao: planoMap[l.debito] || '', items: [] };
    }
    groups[key].items.push(l);
  }
  return Object.values(groups).sort((a, b) => a.conta.localeCompare(b.conta, undefined, { numeric: true }));
};

// Generate CSV content with account grouping
const generateCSV = (lancamentos: any[], planoMap: Record<string, string>): string => {
  const groups = groupByAccount(lancamentos, planoMap);
  let csv = '';
  let grandTotal = 0;

  for (const group of groups) {
    csv += `\n--- Conta: ${group.conta} | ${group.descricao || 'Sem descrição'} ---\n`;
    csv += 'Data,Valor,Historico,Debito,Desc.Debito,Credito,Desc.Credito\n';
    let subtotal = 0;
    for (const l of group.items) {
      const val = l.valor || 0;
      subtotal += val;
      csv += `${l.data || ''},${val},${(l.historico || '').replace(/,/g, ';').replace(/\n/g, ' ')},${l.debito || ''},${(planoMap[l.debito] || '').replace(/,/g, ';')},${l.credito || ''},${(planoMap[l.credito] || '').replace(/,/g, ';')}\n`;
    }
    csv += `Subtotal: ${group.items.length} lançamentos,,${subtotal},,,,\n`;
    grandTotal += subtotal;
  }
  csv += `\nTotal Geral: ${lancamentos.length} lançamentos,,${grandTotal},,,,\n`;
  return csv;
};

// Generate Excel buffer with account grouping
const generateExcel = (lancamentos: any[], planoMap: Record<string, string>): Uint8Array => {
  const groups = groupByAccount(lancamentos, planoMap);
  const rows: any[] = [];

  for (const group of groups) {
    // Group header
    rows.push({ 'Data': `Conta: ${group.conta}`, 'Valor': '', 'Histórico': group.descricao || 'Sem descrição', 'Débito': '', 'Desc. Débito': '', 'Crédito': '', 'Desc. Crédito': '' });
    
    let subtotal = 0;
    for (const l of group.items) {
      subtotal += l.valor || 0;
      rows.push({
        'Data': l.data || '',
        'Valor': l.valor || 0,
        'Histórico': l.historico || '',
        'Débito': l.debito || '',
        'Desc. Débito': planoMap[l.debito] || '',
        'Crédito': l.credito || '',
        'Desc. Crédito': planoMap[l.credito] || '',
      });
    }
    // Subtotal row
    rows.push({ 'Data': `Subtotal: ${group.items.length} lançamentos`, 'Valor': subtotal, 'Histórico': '', 'Débito': '', 'Desc. Débito': '', 'Crédito': '', 'Desc. Crédito': '' });
    // Empty row separator
    rows.push({ 'Data': '', 'Valor': '', 'Histórico': '', 'Débito': '', 'Desc. Débito': '', 'Crédito': '', 'Desc. Crédito': '' });
  }

  // Grand total
  const grandTotal = lancamentos.reduce((s: number, l: any) => s + (l.valor || 0), 0);
  rows.push({ 'Data': `Total Geral: ${lancamentos.length} lançamentos`, 'Valor': grandTotal, 'Histórico': '', 'Débito': '', 'Desc. Débito': '', 'Crédito': '', 'Desc. Crédito': '' });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 15 }, { wch: 15 }, { wch: 50 }, { wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 25 }
  ];
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Lançamentos');
  
  const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(excelBuffer);
};

// Export function to generate files and complete closing
export const completeMonthClosing = async (
  supabase: any,
  userId: string,
  competencia: string,
  format: string,
  userInfo: any,
  verificationId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get lancamentos
    let { data: lancamentos } = await supabase
      .from('lancamentos_alinhados')
      .select('*')
      .eq('user_id', userId)
      .eq('competencia', competencia)
      .order('data', { ascending: true });

    if (!lancamentos || lancamentos.length === 0) {
      throw new Error('Nenhum lançamento encontrado');
    }

    // Get plano de contas for descriptions
    const { data: planoData } = await supabase
      .from('planos_contas')
      .select('conteudo')
      .eq('user_id', userId)
      .maybeSingle();
    
    const planoMap = planoData?.conteudo ? buildPlanoContasMap(planoData.conteudo) : {};

    // Generate files
    let csvFilePath = null;
    let excelFilePath = null;

    const csvContent = generateCSV(lancamentos, planoMap);
    const csvFileName = `${userId}/${competencia}/lancamentos_${competencia}.csv`;
    
    const { error: csvUploadError } = await supabase.storage
      .from('lancamentos')
      .upload(csvFileName, csvContent, {
        contentType: 'text/csv',
        upsert: true
      });

    if (!csvUploadError) {
      csvFilePath = csvFileName;
    }

    if (format === 'excel' || format === 'all') {
      try {
        const excelBuffer = generateExcel(lancamentos, planoMap);
        const excelFileName = `${userId}/${competencia}/lancamentos_${competencia}.xlsx`;
        
        const { error: excelUploadError } = await supabase.storage
          .from('lancamentos')
          .upload(excelFileName, excelBuffer, {
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            upsert: true
          });

        if (!excelUploadError) {
          excelFilePath = excelFileName;
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
        total_lancamentos: lancamentos.length,
        arquivo_csv_url: csvFilePath,
        arquivo_excel_url: excelFilePath
      })
      .eq('verification_id', verificationId);

    if (updateError) {
      console.error('Error updating fechamento:', updateError);
    }

    // Record in month_closures
    await supabase
      .from('month_closures')
      .insert({
        user_id: userId,
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
        user_id: userId,
        message: `Mês ${competencia} fechado com sucesso! ${lancamentos.length} lançamentos exportados.`,
        type: 'mes_fechado'
      });

    console.log(`Month closing completed for ${userId}, ${competencia}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error completing month closing:', error);
    
    // Update status to error
    await supabase
      .from('fechamentos_exportados')
      .update({ n8n_status: 'erro' })
      .eq('verification_id', verificationId);
    
    return { success: false, error: error.message };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !callingUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const isAdmin = await checkIsAdmin(supabase, callingUser.id);

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem fechar meses' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { user_id, competencia, format = 'excel', skip_n8n_verification = false } = await req.json();

    console.log(`Admin ${callingUser.email} closing month ${competencia} for user ${user_id}`);

    // Get user info
    const { data: userInfo } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', user_id)
      .single();

    // Check if already closed
    const { data: existingFechamento } = await supabase
      .from('fechamentos_exportados')
      .select('id, n8n_status')
      .eq('user_id', user_id)
      .eq('competencia', competencia)
      .single();

    if (existingFechamento) {
      if (existingFechamento.n8n_status === 'verificando') {
        return new Response(JSON.stringify({ 
          status: 'verificando',
          message: 'Verificação em andamento'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: 'Mês já foi fechado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check for unprocessed documents
    const { data: pendingDocs } = await supabase
      .from('documentos_brutos')
      .select('id, nome_arquivo, status_processamento')
      .eq('user_id', user_id)
      .eq('competencia', competencia)
      .in('status_processamento', ['nao_processado', 'processando']);

    if (pendingDocs && pendingDocs.length > 0) {
      return new Response(JSON.stringify({ 
        error: 'Existem documentos pendentes de processamento',
        pending_docs: pendingDocs.map(d => ({ id: d.id, nome: d.nome_arquivo }))
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get all aligned lancamentos
    let { data: lancamentos, error: lancError } = await supabase
      .from('lancamentos_alinhados')
      .select('*')
      .eq('user_id', user_id)
      .eq('competencia', competencia)
      .order('data', { ascending: true });

    if (lancError) throw lancError;

    if (!lancamentos || lancamentos.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum lançamento alinhado para fechar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${lancamentos.length} lancamentos for closing`);

    // Generate verification ID
    const verificationId = crypto.randomUUID();

    // Create pending fechamento record
    const { error: insertError } = await supabase
      .from('fechamentos_exportados')
      .insert({
        user_id,
        user_name: userInfo?.name,
        user_email: userInfo?.email,
        competencia,
        status: 'pendente',
        n8n_status: 'verificando',
        verification_id: verificationId,
        total_lancamentos: lancamentos.length
      });

    if (insertError) {
      console.error('Error creating fechamento:', insertError);
      throw insertError;
    }

    // If skipping n8n, complete immediately
    if (skip_n8n_verification) {
      const duplicatesRemoved = await removeDuplicates(supabase, user_id, competencia);
      console.log(`Removed ${duplicatesRemoved} duplicates locally (skip_n8n)`);
      
      const result = await completeMonthClosing(supabase, user_id, competencia, format, userInfo, verificationId);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return new Response(JSON.stringify({ 
        status: 'concluido',
        success: true,
        verification_id: verificationId,
        total_lancamentos: lancamentos.length - duplicatesRemoved,
        duplicates_removed: duplicatesRemoved,
        n8n_verified: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Send to n8n for async verification
    const lancamentosSimplificados = lancamentos.map(l => ({
      data: l.data,
      historico: l.historico,
      debito: l.debito,
      credito: l.credito,
      valor: l.valor
    }));

    console.log(`Sending ${lancamentosSimplificados.length} lancamentos to n8n for verification`);

    try {
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'verificacao-fechamento',
          verification_id: verificationId,
          user_id,
          competencia,
          format,
          lancamentos: lancamentosSimplificados,
          callback_url: `${supabaseUrl}/functions/v1/receive-n8n-response`
        })
      });

      if (!n8nResponse.ok) {
        console.error('n8n returned error:', n8nResponse.status);
        // Fallback to local processing
        const duplicatesRemoved = await removeDuplicates(supabase, user_id, competencia);
        const result = await completeMonthClosing(supabase, user_id, competencia, format, userInfo, verificationId);
        
        return new Response(JSON.stringify({ 
          status: 'concluido',
          success: true,
          verification_id: verificationId,
          total_lancamentos: lancamentos.length - duplicatesRemoved,
          duplicates_removed: duplicatesRemoved,
          n8n_verified: false,
          message: 'Fechado localmente (n8n indisponível)'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Return immediately with verification pending status
      return new Response(JSON.stringify({ 
        status: 'verificando',
        verification_id: verificationId,
        message: 'Aguardando verificação do n8n...',
        total_lancamentos: lancamentos.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (n8nError: any) {
      console.error('Error calling n8n:', n8nError);
      // Fallback to local processing
      const duplicatesRemoved = await removeDuplicates(supabase, user_id, competencia);
      const result = await completeMonthClosing(supabase, user_id, competencia, format, userInfo, verificationId);
      
      return new Response(JSON.stringify({ 
        status: 'concluido',
        success: true,
        verification_id: verificationId,
        total_lancamentos: lancamentos.length - duplicatesRemoved,
        duplicates_removed: duplicatesRemoved,
        n8n_verified: false,
        message: 'Fechado localmente (erro ao conectar n8n)'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
