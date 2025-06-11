
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.3'

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create Supabase client using environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Handle document cleanup - delete documents 7 days after expiration
async function deleteExpiredDocuments() {
  console.log('Starting expired documents cleanup (7 days after expiration)')
  
  try {
    // Calculate date 7 days ago
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    console.log('Looking for documents expired before:', sevenDaysAgo.toISOString())
    
    // Get all documents that expired more than 7 days ago
    const { data: expiredDocs, error: fetchError } = await supabase
      .from('documents')
      .select('id, storage_key, name, expires_at')
      .lt('expires_at', sevenDaysAgo.toISOString())
      .not('expires_at', 'is', null)
    
    if (fetchError) {
      console.error('Error fetching expired documents:', fetchError)
      throw fetchError
    }
    
    console.log(`Found ${expiredDocs?.length || 0} documents expired for more than 7 days`)
    
    if (!expiredDocs || expiredDocs.length === 0) {
      return { success: true, message: 'No expired documents to delete', deleted: 0 }
    }
    
    // Get storage keys for expired documents that have them
    const storageKeys = expiredDocs
      .filter(doc => doc.storage_key)
      .map(doc => doc.storage_key)
    
    // Delete files from storage if there are any
    if (storageKeys.length > 0) {
      console.log(`Deleting ${storageKeys.length} files from storage`)
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove(storageKeys)
      
      if (storageError) {
        // Log but continue with database cleanup
        console.error('Error deleting files from storage:', storageError)
      } else {
        console.log('Files deleted successfully from storage')
      }
    }
    
    // Delete records from the database
    const documentIds = expiredDocs.map(doc => doc.id)
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .in('id', documentIds)
    
    if (dbError) {
      console.error('Error deleting document records:', dbError)
      throw dbError
    }
    
    console.log(`Successfully deleted ${documentIds.length} expired documents`)
    
    // Log details of deleted documents
    expiredDocs.forEach(doc => {
      console.log(`Deleted document: ${doc.name} (expired on: ${doc.expires_at})`)
    })
    
    return { 
      success: true, 
      message: `Deleted ${documentIds.length} documents expired for more than 7 days`, 
      deleted: documentIds.length,
      deletedDocuments: expiredDocs.map(doc => ({
        name: doc.name,
        expiredOn: doc.expires_at
      }))
    }
  } catch (error) {
    console.error('Error in document cleanup process:', error)
    return { success: false, message: error.message, deleted: 0 }
  }
}

// Serve the HTTP requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    // Allow POST requests for manual trigger or scheduled execution
    if (req.method === 'POST') {
      const result = await deleteExpiredDocuments()
      return new Response(
        JSON.stringify(result),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }
    
    // For any other request method
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
