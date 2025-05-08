
// Edge function to delete document notifications older than 7 days
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
    console.log('Starting deletion of old document notifications')
    
    // Calculate the date 7 days ago
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoISO = sevenDaysAgo.toISOString()
    
    console.log(`Deleting document notifications older than: ${sevenDaysAgoISO}`)
    
    // Delete document notifications older than 7 days
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('type', 'Novo Documento')
      .lt('created_at', sevenDaysAgoISO)
      .select()
    
    if (error) {
      console.error('Error deleting old document notifications:', error)
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      )
    }
    
    const deletedCount = data?.length || 0
    console.log(`Successfully deleted ${deletedCount} old document notifications`)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully deleted ${deletedCount} old document notifications` 
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
