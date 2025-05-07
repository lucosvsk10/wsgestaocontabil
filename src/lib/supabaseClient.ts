
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../integrations/supabase/types';

// Constants for Supabase configuration
const SUPABASE_URL = "https://nadtoitgkukzbghtbohm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hZHRvaXRna3VremJnaHRib2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTY5MTEsImV4cCI6MjA1OTE5MjkxMX0.-dF-MxB7bcJCXTPC0fo_U50yzukvTrP1QKtJyBCmIoE";

/**
 * Supabase client instance with typed schema
 * Import this client from your components instead of creating multiple instances
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

/**
 * Get storage bucket URL for a specific bucket
 * @param bucketName Name of the storage bucket
 * @returns Full URL to the bucket
 */
export const getStorageBucketUrl = (bucketName: string): string => {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucketName}`;
};

/**
 * Headers for Supabase API requests
 */
export const supabaseHeaders = {
  'X-Client-Info': 'ws-gestao-contabil',
  'apikey': SUPABASE_PUBLISHABLE_KEY,
};
