
import { supabase } from '@/lib/supabaseClient';

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
  } catch (error: any) {
    console.error('Exception while triggering document cleanup:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Check if a document is expired
 * @param expirationDate Document expiration date string
 * @returns Boolean indicating if document is expired
 */
export const isDocumentExpired = (expirationDate: string | null): boolean => {
  if (!expirationDate) return false;
  
  const expiryDate = new Date(expirationDate);
  const currentDate = new Date();
  
  return expiryDate < currentDate;
};

/**
 * Calculate days until document expiration
 * @param expirationDate Document expiration date string
 * @returns String representation of days until expiration or null if no expiration
 */
export const daysUntilExpiration = (expirationDate: string | null): string | null => {
  if (!expirationDate) return "Sem validade";
  
  const expiryDate = new Date(expirationDate);
  const currentDate = new Date();
  
  // If expired, return "Expirado"
  if (expiryDate < currentDate) {
    return "Expirado";
  }
  
  // Calculate days remaining
  const timeDiff = expiryDate.getTime() - currentDate.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  if (daysDiff === 0) return "Hoje";
  if (daysDiff === 1) return "Amanhã";
  return `${daysDiff} dias`;
};
