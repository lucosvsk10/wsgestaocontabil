import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { consume, limited, requestKey } from '../_shared/rate-limit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const strongPassword = (value: string) => value.length >= 12 && value.length <= 128 &&
  [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((rule) => rule.test(value)).length >= 3

const normalizeUsername = (value: unknown) => String(value || '').trim().toLowerCase()
const validUsername = (value: string) => /^[a-z0-9][a-z0-9._-]{2,31}$/.test(value)

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

    const limit = await consume(admin, 'admin_create_user', requestKey(req, caller.id), 20, 600)
    const blocked = limited(limit)
    if (blocked) return blocked

    const body = await req.json()
    const name = String(body.name || '').trim().slice(0, 160)
    const password = String(body.password || '')
    const role = ['client','admin','fiscal','contabil','geral'].includes(body.role) ? body.role : 'client'
    const username = normalizeUsername(body.username)
    const requestedEmail = String(body.email || '').trim().toLowerCase()

    if (!name || !strongPassword(password)) {
      return new Response(JSON.stringify({ error: 'Nome e senha de 12 a 128 caracteres, combinando ao menos três tipos de caracteres, são obrigatórios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let email = requestedEmail
    if (role === 'client') {
      if (!validUsername(username)) {
        return new Response(JSON.stringify({ error: 'Nome de usuário inválido. Use 3 a 32 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const { data: existingUsername } = await admin.from('users').select('id').ilike('username', username).limit(1).maybeSingle()
      if (existingUsername?.id) {
        return new Response(JSON.stringify({ error: 'Esse nome de usuário já está em uso.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      email = `${username}@acesso.wsgestaocontabil.com`
    } else if (!email) {
      return new Response(JSON.stringify({ error: 'E-mail é obrigatório para usuários administrativos.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: authUser, error: authCreateError } = await admin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, ...(role === 'client' ? { username } : {}) },
      email_confirm: true,
    })
    if (authCreateError || !authUser.user) throw authCreateError || new Error('Falha ao criar usuário')

    const { error: profileError } = await admin.from('users').insert({
      id: authUser.user.id,
      email,
      name,
      role,
      username: role === 'client' ? username : null,
      must_change_password: role === 'client'
    })
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
      metadata: {
        source: 'edge_function',
        function: 'create-user',
        assigned_role: role,
        credential_type: role === 'client' ? 'username' : 'email'
      }
    })

    return new Response(JSON.stringify({
      success: true,
      user: { id: authUser.user.id, email: role === 'client' ? undefined : email, username: role === 'client' ? username : undefined, name, role }
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('create-user:', error)
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
