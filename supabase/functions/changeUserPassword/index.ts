
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle CORS preflight requests
const handleCORS = (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }
}

// Create a Supabase admin client
const createAdminClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing environment variables for Supabase')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Check if the user has admin privileges using user_roles table
const isAdmin = async (token: string) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_ANON_KEY') || '',
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  )

  const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
  
  if (userError || !user) {
    throw new Error('Unauthorized')
  }
  
  // Check if the user is an admin using user_roles table
  const { data: roles, error: roleError } = await supabaseClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
  
  if (roleError) {
    throw new Error('Error fetching user role')
  }
  
  // Only database role determines admin status
  return roles?.some(r => r.role === 'admin') || false
}

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCORS(req)
  if (corsResponse) return corsResponse

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header')
    }

    const token = authHeader.substring(7)
    const adminAuthorized = await isAdmin(token)

    if (!adminAuthorized) {
      throw new Error('Unauthorized: Admin privileges required')
    }

    // Parse the request body
    const { userId, newPassword } = await req.json()
    
    if (!userId || !newPassword) {
      throw new Error('Missing required fields: userId and newPassword')
    }
    
    // Create an admin client to update the user password
    const adminClient = createAdminClient()
    
    const { error } = await adminClient.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )
    
    if (error) {
      throw error
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Password changed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
    
  } catch (error) {
    console.error('Error:', error.message)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
