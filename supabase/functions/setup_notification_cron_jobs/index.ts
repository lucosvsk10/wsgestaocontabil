
// Edge function to set up the cron jobs for the notification management
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

async function setupCronJobs() {
  const anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hZHRvaXRna3VremJnaHRib2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTY5MTEsImV4cCI6MjA1OTE5MjkxMX0.-dF-MxB7bcJCXTPC0fo_U50yzukvTrP1QKtJyBCmIoE"
  
  // Enable the pg_cron and pg_net extensions if they're not already enabled
  try {
    console.log("Enabling pg_cron and pg_net extensions...")
    await supabase.rpc('enable_pg_cron_and_pg_net')
    console.log("Extensions enabled successfully")
  } catch (error) {
    console.error("Error enabling extensions:", error)
    // Continue anyway as they might already be enabled
  }

  // Setup each cron job
  try {
    // 1. Delete daily login/logout notifications (daily at 3 AM)
    await supabase.rpc('create_cron_job', {
      job_name: 'delete_daily_log_notifications_job',
      schedule: '0 3 * * *',
      function_url: 'https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/delete_daily_log_notifications',
      auth_header: `Bearer ${anon_key}`,
    })
    console.log("Created cron job for deleting daily login/logout notifications")
    
    // 2. Delete old document notifications (daily at 2 AM)
    await supabase.rpc('create_cron_job', {
      job_name: 'delete_old_document_notifications_job',
      schedule: '0 2 * * *',
      function_url: 'https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/delete_old_document_notifications',
      auth_header: `Bearer ${anon_key}`,
    })
    console.log("Created cron job for deleting old document notifications")
    
    // 3. Notify about expiring documents (daily at 6 AM)
    await supabase.rpc('create_cron_job', {
      job_name: 'notify_expiring_documents_job',
      schedule: '0 6 * * *',
      function_url: 'https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/notify_expiring_documents',
      auth_header: `Bearer ${anon_key}`,
    })
    console.log("Created cron job for notifying about expiring documents")
    
    return { success: true, message: "Cron jobs set up successfully" }
  } catch (error) {
    console.error("Error setting up cron jobs:", error)
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
    console.log('Setting up notification cron jobs')
    
    const result = await setupCronJobs()
    
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
