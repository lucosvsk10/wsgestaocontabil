
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

// CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to handle CORS preflight requests
function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    })
  }
  return null
}

serve(async (req) => {
  // Handle CORS preflight request
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  // Parse request body
  let input
  try {
    input = await req.json()
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { userId, email, name, adminApiKey } = input

  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'UserId is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = adminApiKey || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase URL or service role key')
    }

    // Create Supabase client with admin rights
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    })

    console.log(`Attempting to create/verify user profile for ID: ${userId}`)

    // First check if user already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (checkError) {
      throw new Error(`Error checking for existing user: ${checkError.message}`)
    }

    // Only create if user doesn't exist
    if (!existingUser) {
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          email: email || null,
          name: name || 'Usuário',
          role: 'client',
          created_at: new Date().toISOString()
        })
        .select()

      if (insertError) {
        throw new Error(`Error creating user profile: ${insertError.message}`)
      }

      return new Response(
        JSON.stringify({ success: true, message: 'User profile created', data: insertData }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'User profile already exists', data: existingUser }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in create-user-profile function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
