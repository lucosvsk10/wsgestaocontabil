
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Set up Supabase client with service role key
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

async function setupDocumentCleanupCron() {
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  
  try {
    console.log("Setting up document cleanup cron job...")
    
    // Setup cron job to run document cleanup daily at 2 AM
    const { data, error } = await supabase.rpc('cron_schedule', {
      job_name: 'delete_expired_documents_job',
      schedule: '0 2 * * *', // Daily at 2 AM
      command: `
        SELECT net.http_post(
          url := '${supabaseUrl}/functions/v1/delete-expired-documents',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer ${anonKey}"}'::jsonb,
          body := '{}'::jsonb
        );
      `
    })
    
    if (error) {
      console.error("Error setting up cron job:", error)
      
      // Try alternative approach using raw SQL
      const { error: sqlError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT cron.schedule(
            'delete_expired_documents_job',
            '0 2 * * *',
            $$
            SELECT net.http_post(
              url := '${supabaseUrl}/functions/v1/delete-expired-documents',
              headers := '{"Content-Type": "application/json", "Authorization": "Bearer ${anonKey}"}'::jsonb,
              body := '{}'::jsonb
            );
            $$
          );
        `
      })
      
      if (sqlError) {
        throw new Error(`Failed to create cron job: ${sqlError.message}`)
      }
    }
    
    console.log("Document cleanup cron job set up successfully")
    return { success: true, message: "Document cleanup cron job configured to run daily at 2 AM" }
  } catch (error) {
    console.error("Error setting up document cleanup cron job:", error)
    return { success: false, error: String(error) }
  }
}

// Handle requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    console.log('Setting up document cleanup cron job')
    
    const result = await setupDocumentCleanupCron()
    
    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      )
    }
    
    return new Response(
      JSON.stringify({ success: true, message: result.message }),
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
