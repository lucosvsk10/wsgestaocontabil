
import { supabase } from "@/integrations/supabase/client";

/**
 * Trigger the cleanup of expired documents via the edge function
 * @returns Promise with the cleanup operation result
 */
export const triggerExpiredDocumentsCleanup = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('delete-expired-documents', {
      method: 'POST',
    });
    
    if (error) {
      console.error('Error triggering document cleanup:', error);
      return { success: false, message: error.message };
    }
    
    return data;
  } catch (error) {
    console.error('Exception while triggering document cleanup:', error);
    return { success: false, message: error.message };
  }
};
