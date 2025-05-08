
// Edge function to create notifications for documents expiring in 3 days
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
    console.log('Checking for documents expiring in 3 days')
    
    // Calculate the date 3 days from now
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    
    // Calculate the date 4 days from now (to create a 24-hour range)
    const fourDaysFromNow = new Date()
    fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 4)
    
    const threeDaysFromNowISO = threeDaysFromNow.toISOString().split('T')[0]
    const fourDaysFromNowISO = fourDaysFromNow.toISOString().split('T')[0]
    
    console.log(`Looking for documents expiring between ${threeDaysFromNowISO} and ${fourDaysFromNowISO}`)
    
    // Find documents that expire in 3 days and haven't been viewed
    const { data: expiringDocuments, error: docError } = await supabase
      .from('documents')
      .select('id, name, user_id, expires_at')
      .eq('viewed', false)
      .gte('expires_at', `${threeDaysFromNowISO}T00:00:00Z`)
      .lt('expires_at', `${fourDaysFromNowISO}T00:00:00Z`)
    
    if (docError) {
      console.error('Error fetching expiring documents:', docError)
      return new Response(
        JSON.stringify({ success: false, error: docError.message }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      )
    }
    
    console.log(`Found ${expiringDocuments?.length || 0} expiring documents`)
    
    // Create notifications for each expiring document
    const notificationsCreated = []
    for (const doc of expiringDocuments || []) {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: doc.user_id,
          message: `O documento '${doc.name}' irá expirar em breve!`,
          type: 'Aviso de Vencimento'
        })
        .select()
        .single()
      
      if (error) {
        console.error(`Error creating notification for document ${doc.id}:`, error)
        continue
      }
      
      notificationsCreated.push(data)
      console.log(`Created expiration notification for document: ${doc.name}`)
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${notificationsCreated.length} notifications for expiring documents`,
        notifications: notificationsCreated
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
