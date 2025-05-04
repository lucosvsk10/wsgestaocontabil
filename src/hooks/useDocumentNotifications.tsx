
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Document } from "@/types/admin";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const useDocumentNotifications = (refreshDocuments: () => void) => {
  const [unreadDocuments, setUnreadDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Function to fetch unread documents
  const fetchUnreadDocuments = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .eq("viewed", false)
        .order("uploaded_at", { ascending: false });
        
      if (error) throw error;
      
      setUnreadDocuments(data || []);
    } catch (error: any) {
      console.error("Error fetching unread documents:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar notificações",
        description: error.message || "Não foi possível carregar as notificações de documentos."
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate unread counts by category
  const getUnreadCountByCategory = (category: string): number => {
    return unreadDocuments.filter(doc => doc.category === category).length;
  };
  
  // Total unread count
  const getTotalUnreadCount = (): number => {
    return unreadDocuments.length;
  };
  
  // Check if a specific document is unread
  const isDocumentUnread = (documentId: string): boolean => {
    return unreadDocuments.some(doc => doc.id === documentId);
  };
  
  // Set up real-time subscription for document updates
  useEffect(() => {
    if (!user?.id) return;
    
    // Initial fetch of unread documents
    fetchUnreadDocuments();
    
    // Subscribe to real-time updates for document status changes
    const channel = supabase
      .channel('document-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Document change detected:", payload);
          
          // Refresh unread documents when any document changes
          fetchUnreadDocuments();
          
          // Also refresh the full document list
          refreshDocuments();
        }
      )
      .subscribe();
    
    // Clean up subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
  
  return {
    unreadDocuments,
    isLoading,
    getUnreadCountByCategory,
    getTotalUnreadCount,
    isDocumentUnread,
    fetchUnreadDocuments
  };
};
