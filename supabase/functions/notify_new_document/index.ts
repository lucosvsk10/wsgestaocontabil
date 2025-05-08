
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.3'

// Set up Supabase client with service role key
const supabaseUrl = 'https://nadtoitgkukzbghtbohm.supabase.co'
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    )
  }
  
  // Parse request body
  try {
    const { user_id, document_name } = await req.json()
    
    // Validate required fields
    if (!user_id || !document_name) {
      return new Response(
        JSON.stringify({ error: 'user_id and document_name are required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      )
    }
    
    console.log(`Creating notification for user ${user_id} about document: ${document_name}`)
    
    // Insert notification into the database using service role (bypasses RLS)
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id,
        message: `Novo documento enviado: ${document_name}`,
        type: 'Novo Documento'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating notification:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      )
    }
    
    console.log('Notification created successfully:', data)
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true,
        notification: data
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    )
  }
})
