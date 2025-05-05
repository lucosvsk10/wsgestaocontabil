
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Document } from "@/utils/auth/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const useDocumentNotifications = (refreshDocuments: () => void) => {
  const [unreadDocuments, setUnreadDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Function to fetch unread documents
  const fetchUnreadDocuments = async () => {
    if (!user?.id) return [];
    
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
      return data || [];
    } catch (error: any) {
      console.error("Error fetching unread documents:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar notificações",
        description: error.message || "Não foi possível carregar as notificações de documentos."
      });
      return [];
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
  
  // Mark all documents in a category as read
  const markAllCategoryAsRead = async (category: string) => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      const docsToUpdate = unreadDocuments.filter(doc => doc.category === category).map(doc => doc.id);
      
      if (docsToUpdate.length === 0) return;
      
      const { error } = await supabase
        .from("documents")
        .update({ 
          viewed: true,
          viewed_at: new Date().toISOString()
        })
        .in("id", docsToUpdate);
        
      if (error) throw error;
      
      // Update local state
      setUnreadDocuments(prev => prev.filter(doc => doc.category !== category));
      
      // Refresh documents to update UI
      refreshDocuments();
      
      toast({
        title: "Notificações atualizadas",
        description: `Todos os documentos da categoria ${category} foram marcados como visualizados.`
      });
    } catch (error: any) {
      console.error("Error marking category as read:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar notificações",
        description: error.message || "Não foi possível marcar os documentos como visualizados."
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Mark all documents as read
  const markAllAsRead = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from("documents")
        .update({ 
          viewed: true,
          viewed_at: new Date().toISOString()
        })
        .eq("user_id", user.id)
        .eq("viewed", false);
        
      if (error) throw error;
      
      // Update local state
      setUnreadDocuments([]);
      
      // Refresh documents to update UI
      refreshDocuments();
      
      toast({
        title: "Notificações atualizadas",
        description: "Todos os documentos foram marcados como visualizados."
      });
    } catch (error: any) {
      console.error("Error marking all as read:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar notificações",
        description: error.message || "Não foi possível marcar os documentos como visualizados."
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch unread documents once when component mounts and user is available
  useEffect(() => {
    if (user?.id) {
      fetchUnreadDocuments();
    }
  }, [user?.id]);
  
  return {
    unreadDocuments,
    isLoading,
    getUnreadCountByCategory,
    getTotalUnreadCount,
    isDocumentUnread,
    fetchUnreadDocuments,
    markAllCategoryAsRead,
    markAllAsRead
  };
};
