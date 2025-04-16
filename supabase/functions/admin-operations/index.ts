
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

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
  
  // Admin email check
  const isAdminByEmail = user.email === 'wsgestao@gmail.com' || user.email === 'l09022007@gmail.com'
  if (isAdminByEmail) return true
  
  // Check if the user is an admin in the database
  const { data: userData, error: roleError } = await supabaseClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (roleError) {
    throw new Error('Error fetching user role')
  }
  
  // Check if user role is admin or equivalent
  return ['admin', 'fiscal', 'contabil', 'geral'].includes(userData?.role || '')
}

// Main handler
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
    const { operation } = body
    
    if (!operation) {
      throw new Error('Operation field is required')
    }
    
    // Create an admin client for operations
    const adminClient = createAdminClient()
    
    // Handle different operations
    switch (operation) {
      case 'changePassword':
        return await handleChangePassword(adminClient, body)
      
      case 'deleteUser':
        return await handleDeleteUser(adminClient, body)
      
      case 'changeRole':
        return await handleChangeRole(adminClient, body)
        
      default:
        throw new Error(`Unsupported operation: ${operation}`)
    }
    
  } catch (error) {
    console.error('Error:', error.message)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

// Handle password change operation
async function handleChangePassword(adminClient: any, body: any) {
  const { userId, newPassword } = body
  
  if (!userId || !newPassword) {
    throw new Error('Missing required fields: userId and newPassword')
  }
  
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
}

// Handle user deletion operation
async function handleDeleteUser(adminClient: any, body: any) {
  const { userId } = body
  
  if (!userId) {
    throw new Error('Missing required field: userId')
  }
  
  const { error } = await adminClient.auth.admin.deleteUser(userId)
  
  if (error) {
    throw error
  }
  
  return new Response(
    JSON.stringify({ success: true, message: 'User deleted successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  )
}

// Handle role change operation
async function handleChangeRole(adminClient: any, body: any) {
  const { userId, newRole } = body
  
  if (!userId || !newRole) {
    throw new Error('Missing required fields: userId and newRole')
  }
  
  // Validate role
  const validRoles = ['admin', 'fiscal', 'contabil', 'geral', 'client']
  if (!validRoles.includes(newRole)) {
    throw new Error(`Invalid role: ${newRole}. Must be one of: ${validRoles.join(', ')}`)
  }
  
  // Update user role in the database
  const { error } = await adminClient
    .from('users')
    .update({ role: newRole })
    .eq('id', userId)
  
  if (error) {
    throw error
  }
  
  return new Response(
    JSON.stringify({ success: true, message: `Role changed to ${newRole} successfully` }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  )
}
