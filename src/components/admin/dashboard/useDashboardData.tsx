
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useStorageStats } from "@/hooks/useStorageStats";

export const useDashboardData = (supabaseUsers: any[]) => {
  const { user } = useAuth();
  const [lastLogin, setLastLogin] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);
  const [pollCount, setPollCount] = useState<number>(0);
  const [totalDocumentsCount, setTotalDocumentsCount] = useState<number>(0);
  
  // Use the storage stats hook to get accurate storage information
  const { 
    storageStats, 
    isLoading: isLoadingStorage, 
    error: storageError,
    fetchStorageStats 
  } = useStorageStats();
  
  // Get last login date for current user
  useEffect(() => {
    if (user) {
      const fetchAuthUser = async () => {
        try {
          const { data, error } = await supabase.auth.getUser();
          if (error) throw error;
          
          if (data?.user?.last_sign_in_at) {
            setLastLogin(formatDate(data.user.last_sign_in_at));
          }
        } catch (error) {
          console.error('Error fetching auth user:', error);
        }
      };
      
      fetchAuthUser();
    }
  }, [user]);
  
  // Fetch total documents count
  const fetchTotalDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const { count, error } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      setTotalDocumentsCount(count || 0);
    } catch (error) {
      console.error("Error fetching total documents:", error);
      setTotalDocumentsCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Fetch initial data
  useEffect(() => {
    fetchTotalDocuments();
    fetchStorageStats();
    
    // Also fetch poll count and recent documents
    const fetchPolls = async () => {
      try {
        const { count, error } = await supabase
          .from('polls')
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        setPollCount(count || 0);
      } catch (error) {
        console.error("Error fetching polls:", error);
        setPollCount(0);
      }
    };
    
    fetchPolls();
  }, [fetchTotalDocuments, fetchStorageStats]);
  
  // Fetch recent documents
  useEffect(() => {
    const fetchRecentDocuments = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('documents')
          .select('*, user_id')
          .order('uploaded_at', { ascending: false })
          .limit(5);
        
        if (error) throw error;
        
        // Enrich with user data
        const enrichedDocs = data.map(doc => {
          const user = supabaseUsers.find(u => u.id === doc.user_id);
          return {
            ...doc,
            userName: user?.user_metadata?.name || 'Usuário sem nome',
            userEmail: user?.email || 'Sem email'
          };
        });
        
        setRecentDocuments(enrichedDocs);
      } catch (error) {
        console.error("Error fetching recent documents:", error);
        setRecentDocuments([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (supabaseUsers.length > 0) {
      fetchRecentDocuments();
    }
  }, [supabaseUsers]);
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Data desconhecida';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Data inválida';
    }
  };

  // Format date more nicely
  const formatRecentDate = (dateStr: string) => {
    if (!dateStr) return 'Data desconhecida';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Data inválida';
    }
  };

  const refreshData = useCallback(() => {
    fetchTotalDocuments();
    fetchStorageStats();
  }, [fetchTotalDocuments, fetchStorageStats]);

  return {
    lastLogin,
    totalDocumentsCount,
    pollCount,
    recentDocuments,
    formatRecentDate,
    storageStats,
    storageError,
    refreshData,
    isLoading: isLoading || isLoadingStorage
  };
};
