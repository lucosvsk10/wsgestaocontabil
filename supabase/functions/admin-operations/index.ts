import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Autenticação inválida')

    const url = Deno.env.get('SUPABASE_URL') || ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const jwt = authHeader.slice(7)
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(jwt)
    if (authError || !caller) throw new Error('Usuário não autenticado')

    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', caller.id)
    const isFullAdmin = roles?.some((r: any) => r.role === 'admin') || false
    if (!isFullAdmin) return new Response(JSON.stringify({ error: 'Permissão negada' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const body = await req.json()
    if (body.operation !== 'delete_user' || !body.userId) throw new Error('Operação não suportada')
    if (body.userId === caller.id) throw new Error('Não é permitido excluir o próprio usuário por esta operação')

    const { error } = await admin.auth.admin.deleteUser(body.userId)
    if (error) throw error

    await admin.from('saas_audit_logs').insert({
      actor_user_id: caller.id,
      action: 'delete_user',
      resource_type: 'auth_user',
      resource_id: body.userId,
      is_sensitive: true,
      metadata: { source: 'edge_function', function: 'admin-operations' }
    })

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('admin-operations:', error)
    return new Response(JSON.stringify({ error: error?.message || 'Erro interno' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
