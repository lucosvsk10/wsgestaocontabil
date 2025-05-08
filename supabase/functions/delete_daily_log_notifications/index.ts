
// Edge function to delete daily login/logout notifications
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Set up Supabase client with service role key
const supabaseUrl = 'https://nadtoitgkukzbghtbohm.supabase.co'
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

// Handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    console.log('Starting deletion of login/logout notifications')
    
    // Delete all login/logout notifications
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .in('type', ['login', 'logout'])
      .select()
    
    if (error) {
      console.error('Error deleting login/logout notifications:', error)
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      )
    }
    
    const deletedCount = data?.length || 0
    console.log(`Successfully deleted ${deletedCount} login/logout notifications`)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully deleted ${deletedCount} login/logout notifications` 
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    )
  }
})
