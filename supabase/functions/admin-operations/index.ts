
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

// Check if the user has admin privileges
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
  
  // Check if the user is an admin
  const { data: userData, error: roleError } = await supabaseClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (roleError) {
    throw new Error('Error fetching user role')
  }
  
  const isAdminByEmail = user.email === 'wsgestao@gmail.com' || user.email === 'l09022007@gmail.com'
  
  return (userData?.role === 'admin' || isAdminByEmail)
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
    const body = await req.json()
    
    // Admin supabase client
    const adminClient = createAdminClient()

    // Process the requested action
    switch (body.action) {
      case 'getUsers':
        const { data: users, error: usersError } = await adminClient.auth.admin.listUsers()
        
        if (usersError) {
          throw usersError
        }
        
        return new Response(
          JSON.stringify({ users: users.users }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
        
      case 'deleteUser':
        if (!body.userId) {
          throw new Error('User ID is required')
        }
        
        // Delete the user
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(body.userId)
        
        if (deleteError) {
          throw deleteError
        }
        
        return new Response(
          JSON.stringify({ success: true, message: 'User deleted successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
        
      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    console.error('Error:', error.message)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
