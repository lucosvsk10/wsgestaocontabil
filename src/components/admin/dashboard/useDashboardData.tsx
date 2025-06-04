
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
  
  // Fetch recent documents with proper user data
  useEffect(() => {
    const fetchRecentDocuments = async () => {
      try {
        setIsLoading(true);
        
        // Buscar documentos recentes com dados do usuário
        const { data: documents, error: docsError } = await supabase
          .from('documents')
          .select(`
            id,
            name,
            uploaded_at,
            category,
            user_id,
            users!inner(
              id,
              name,
              email
            )
          `)
          .order('uploaded_at', { ascending: false })
          .limit(5);
        
        if (docsError) {
          console.error("Error fetching documents with users:", docsError);
          // Fallback: buscar apenas documentos
          const { data: fallbackDocs, error: fallbackError } = await supabase
            .from('documents')
            .select('id, name, uploaded_at, category, user_id')
            .order('uploaded_at', { ascending: false })
            .limit(5);
          
          if (fallbackError) throw fallbackError;
          
          // Enriquecer com dados dos usuários do supabaseUsers
          const enrichedDocs = fallbackDocs?.map(doc => {
            const userFromSupabase = supabaseUsers.find(u => u.id === doc.user_id);
            const userFromAuth = supabaseUsers.find(u => u.id === doc.user_id);
            
            return {
              ...doc,
              userName: userFromSupabase?.user_metadata?.name || 
                       userFromAuth?.email?.split('@')[0] || 
                       'Usuário sem nome',
              userEmail: userFromSupabase?.email || userFromAuth?.email || 'Sem email',
              created_at: doc.uploaded_at // Para compatibilidade com o componente
            };
          }) || [];
          
          setRecentDocuments(enrichedDocs);
          return;
        }
        
        // Mapear documentos com dados do usuário
        const enrichedDocs = documents?.map(doc => ({
          ...doc,
          userName: doc.users?.name || 'Usuário sem nome',
          userEmail: doc.users?.email || 'Sem email',
          created_at: doc.uploaded_at // Para compatibilidade com o componente
        })) || [];
        
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
      if (isNaN(date.getTime())) return 'Data inválida';
      
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Data inválida';
    }
  };

  // Format date more nicely for recent documents
  const formatRecentDate = (dateStr: string) => {
    if (!dateStr) return 'Data desconhecida';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Data inválida';
      
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error('Error formatting recent date:', error);
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
