
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
  try {
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
      console.error('Error getting user:', userError)
      throw new Error('Unauthorized')
    }
    
    // Check if the user is an admin by email directly
    const isAdminByEmail = user.email === 'wsgestao@gmail.com' || user.email === 'l09022007@gmail.com'
    if (isAdminByEmail) {
      return true
    }
    
    // If not admin by email, check the role in the database
    try {
      const { data: userData, error: roleError } = await supabaseClient
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (roleError) {
        console.error('Error fetching user role:', roleError)
        // Continue with email check if role lookup fails
      }
      
      return (userData?.role === 'admin' || isAdminByEmail)
    } catch (roleError) {
      console.error('Exception when fetching role:', roleError)
      // If there's an error fetching the role, fall back to email check
      return isAdminByEmail
    }
  } catch (error) {
    console.error('Exception in isAdmin function:', error)
    throw error
  }
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
    
    try {
      const adminAuthorized = await isAdmin(token)

      if (!adminAuthorized) {
        throw new Error('Unauthorized: Admin privileges required')
      }
    } catch (authError) {
      console.error('Authorization error:', authError)
      throw new Error('Authorization check failed: ' + authError.message)
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
        
        try {
          console.log(`Deleting user with ID: ${body.userId}`)
          
          // 1. Delete any documents associated with this user
          const { error: docsError } = await adminClient
            .from('documents')
            .delete()
            .eq('user_id', body.userId)
          
          if (docsError) {
            console.error('Error deleting user documents:', docsError)
            // Continue with deletion even if documents deletion fails
          }
          
          // 2. Delete the user from public.users
          const { error: profileError } = await adminClient
            .from('users')
            .delete()
            .eq('id', body.userId)
          
          if (profileError) {
            console.error('Error deleting user profile:', profileError)
            // Continue anyway, we still want to delete the auth user
          }
          
          // 3. Delete the user from auth.users
          const { error: authError } = await adminClient.auth.admin.deleteUser(
            body.userId
          )
          
          if (authError) {
            throw authError
          }
          
          return new Response(
            JSON.stringify({ success: true, message: 'User deleted successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          )
        } catch (deleteError) {
          console.error('Error in delete user operation:', deleteError)
          throw deleteError
        }
        
      case 'makeAdmin':
        if (!body.userId) {
          throw new Error('User ID is required')
        }
        
        // Update the user's role in public.users
        const { error: updateError } = await adminClient
          .from('users')
          .update({ role: 'admin' })
          .eq('id', body.userId)
        
        if (updateError) {
          throw updateError
        }
        
        return new Response(
          JSON.stringify({ success: true, message: 'User role updated to admin successfully' }),
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
