
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing environment variables for Supabase')
    }
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    )

    // Get the user from the token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      console.error('Error getting user:', userError)
      throw new Error('Unauthorized: User not found')
    }
    
    // Check if the user is an admin by email (hardcoded admin emails)
    const adminEmails = ['wsgestao@gmail.com', 'l09022007@gmail.com']
    if (user.email && adminEmails.includes(user.email)) {
      return true
    }
    
    // Check if the user is an admin in the database
    const { data: userData, error: roleError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (roleError) {
      console.error('Error fetching user role:', roleError)
      return false
    }
    
    return userData?.role === 'admin'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
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
    const adminAuthorized = await isAdmin(token)

    if (!adminAuthorized) {
      throw new Error('Unauthorized: Admin privileges required')
    }

    // Parse the request body
    const body = await req.json()
    
    if (!body.email || !body.name || !body.password) {
      throw new Error('Missing required fields: email, name, and password are required')
    }
    
    // Admin supabase client
    const adminClient = createAdminClient()

    // 1. Create user in auth.users
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true
    })
    
    if (authError) {
      console.error('Error creating auth user:', authError)
      throw authError
    }
    
    if (!authUser.user) {
      throw new Error('Failed to create user')
    }
    
    // 2. Create user in public.users
    const { error: userError } = await adminClient
      .from('users')
      .insert({
        id: authUser.user.id,
        email: body.email,
        name: body.name,
        role: body.isAdmin ? 'admin' : 'client'
      })
    
    if (userError) {
      // If user profile creation fails, delete the auth user
      console.error('Error creating user profile:', userError)
      await adminClient.auth.admin.deleteUser(authUser.user.id)
      throw userError
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User created successfully',
        user: {
          id: authUser.user.id,
          email: authUser.user.email,
          name: body.name,
          role: body.isAdmin ? 'admin' : 'client'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error creating user:', error.message)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
