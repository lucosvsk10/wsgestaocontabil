import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders, status: 204 })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')

    const url = Deno.env.get('SUPABASE_URL') || ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    const { data: { user: caller }, error: authError } = await userClient.auth.getUser()
    if (authError || !caller) throw new Error('Unauthorized')

    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', caller.id)
    const isFullAdmin = roles?.some((r: any) => r.role === 'admin') || false
    if (!isFullAdmin) return new Response(JSON.stringify({ error: 'Admin privileges required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const body = await req.json()
    const email = String(body.email || '').trim().toLowerCase()
    const name = String(body.name || '').trim().slice(0, 160)
    const password = String(body.password || '')
    const role = ['client','admin','fiscal','contabil','geral'].includes(body.role) ? body.role : 'client'

    if (!email || !name || password.length < 8) {
      return new Response(JSON.stringify({ error: 'Email, nome e senha de pelo menos 8 caracteres são obrigatórios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: authUser, error: authCreateError } = await admin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true,
    })
    if (authCreateError || !authUser.user) throw authCreateError || new Error('Falha ao criar usuário')

    const { error: profileError } = await admin.from('users').insert({ id: authUser.user.id, email, name, role })
    if (profileError) {
      await admin.auth.admin.deleteUser(authUser.user.id)
      throw profileError
    }

    if (role !== 'client') {
      const { error: roleError } = await admin.from('user_roles').insert({ user_id: authUser.user.id, role })
      if (roleError) {
        await admin.auth.admin.deleteUser(authUser.user.id)
        throw roleError
      }
    }

    await admin.from('saas_audit_logs').insert({
      actor_user_id: caller.id,
      action: 'create_user',
      resource_type: 'auth_user',
      resource_id: authUser.user.id,
      is_sensitive: true,
      metadata: { source: 'edge_function', function: 'create-user', assigned_role: role }
    })

    return new Response(JSON.stringify({ success: true, user: { id: authUser.user.id, email, name, role } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('create-user:', error)
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
