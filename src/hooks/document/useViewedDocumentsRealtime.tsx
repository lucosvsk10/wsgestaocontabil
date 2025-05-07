
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to subscribe to real-time updates for viewed documents
 * @param refreshDocumentsCallback Callback function to refresh documents when status changes
 */
export const useViewedDocumentsRealtime = (refreshDocumentsCallback: () => void) => {
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user?.id) return;
    
    // Subscribe to changes in visualized_documents table
    const channel = supabase
      .channel('viewed-documents-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'visualized_documents',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Document marked as viewed:', payload);
          // Refresh documents to update the UI
          refreshDocumentsCallback();
        }
      )
      .subscribe();
      
    console.log('Subscribed to viewed documents changes');
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refreshDocumentsCallback]);
};
