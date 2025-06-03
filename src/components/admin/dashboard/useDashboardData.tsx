
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatSize } from "@/utils/storage/formatSize";

export const useDashboardData = (users: any[], supabaseUsers: any[], documents: any[]) => {
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);
  const [fiscalEventsCount, setFiscalEventsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch recent documents with user names
        const { data: documentsData, error: documentsError } = await supabase
          .from('documents')
          .select(`
            *,
            users!inner(name, email)
          `)
          .order('uploaded_at', { ascending: false })
          .limit(5);

        if (documentsError) {
          console.error('Error fetching documents:', documentsError);
        } else {
          setRecentDocuments(documentsData || []);
        }

        // Fetch fiscal events count
        const { count: eventsCount, error: eventsError } = await supabase
          .from('fiscal_events')
          .select('*', { count: 'exact', head: true });

        if (eventsError) {
          console.error('Error fetching fiscal events:', eventsError);
        } else {
          setFiscalEventsCount(eventsCount || 0);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Calculate total storage used
  const totalStorage = documents.reduce((acc, doc) => acc + (doc.size || 0), 0);

  const statistics = {
    totalUsers: users.length,
    totalDocuments: documents.length,
    storageUsed: formatSize(totalStorage),
    fiscalEvents: fiscalEventsCount,
    newUsersThisMonth: users.filter(user => {
      const userDate = new Date(user.created_at);
      const now = new Date();
      return userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear();
    }).length,
  };

  return {
    statistics,
    recentDocuments,
    isLoading
  };
};
