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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(authHeader.slice(7))
    if (authError || !caller) throw new Error('Unauthorized')

    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', caller.id)
    if (!roles?.some((r: any) => r.role === 'admin')) return new Response(JSON.stringify({ error: 'Admin privileges required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { userId, newPassword } = await req.json()
    if (!userId || typeof newPassword !== 'string' || newPassword.length < 8) return new Response(JSON.stringify({ error: 'Invalid data' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword })
    if (error) throw error

    await admin.from('saas_audit_logs').insert({ actor_user_id: caller.id, action: 'change_user_password', resource_type: 'auth_user', resource_id: userId, is_sensitive: true, metadata: { source: 'edge_function', function: 'changeUserPassword' } })
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('changeUserPassword:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
