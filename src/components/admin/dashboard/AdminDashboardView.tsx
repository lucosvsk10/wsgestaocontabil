
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, PieChart, Clock } from "lucide-react";
import { formatDate } from "../utils/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface AdminDashboardViewProps {
  users: any[];
  supabaseUsers: any[];
  documents: any[];
}

export const AdminDashboardView = ({ 
  users, 
  supabaseUsers, 
  documents 
}: AdminDashboardViewProps) => {
  const { user } = useAuth();
  const [lastLogin, setLastLogin] = useState<string>("");
  const [totalStorage, setTotalStorage] = useState<string>("Calculando...");
  const [isLoading, setIsLoading] = useState(false);
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);
  const [pollCount, setPollCount] = useState<number>(0);
  
  // Get non-admin users (clients)
  const clientUsers = supabaseUsers.filter(authUser => {
    const userInfo = users.find(u => u.id === authUser.id);
    return !['fiscal', 'contabil', 'geral'].includes(userInfo?.role || '');
  });
  
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
  
  // Fetch storage size information
  useEffect(() => {
    const fetchStorageSize = async () => {
      try {
        setIsLoading(true);
        // This is a placeholder. In a real implementation, you would need to
        // fetch this data from your backend or Supabase Functions
        // For now, we'll calculate an approximate size based on documents
        const estimatedSizePerDoc = 2; // 2MB per document on average
        const estimatedTotalSize = documents.length * estimatedSizePerDoc;
        
        if (estimatedTotalSize < 1000) {
          setTotalStorage(`${estimatedTotalSize} MB`);
        } else {
          setTotalStorage(`${(estimatedTotalSize / 1000).toFixed(2)} GB`);
        }
      } catch (error) {
        console.error("Error fetching storage size:", error);
        setTotalStorage("Erro ao calcular");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStorageSize();
  }, [documents]);
  
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
      } finally {
        setIsLoading(false);
      }
    };
    
    if (supabaseUsers.length > 0) {
      fetchRecentDocuments();
    }
  }, [supabaseUsers]);
  
  // Fetch poll count
  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const { count, error } = await supabase
          .from('polls')
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        setPollCount(count || 0);
      } catch (error) {
        console.error("Error fetching polls:", error);
      }
    };
    
    fetchPolls();
  }, []);
  
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6 text-navy dark:text-gold">Dashboard</h2>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3 mb-2">
                  <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-lg font-semibold text-navy dark:text-gold">
                  🧑‍💼 Clientes ativos
                </CardTitle>
                <p className="text-3xl font-bold mt-2 text-navy dark:text-white">
                  {clientUsers.length}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3 mb-2">
                  <FileText className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-lg font-semibold text-navy dark:text-gold">
                  📄 Documentos
                </CardTitle>
                <p className="text-3xl font-bold mt-2 text-navy dark:text-white">
                  {documents.length}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-3 mb-2">
                  <PieChart className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-lg font-semibold text-navy dark:text-gold">
                  🧠 Enquetes criadas
                </CardTitle>
                <p className="text-3xl font-bold mt-2 text-navy dark:text-white">
                  {pollCount}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3 mb-2">
                  <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <CardTitle className="text-lg font-semibold text-navy dark:text-gold">
                  ⏱️ Último login
                </CardTitle>
                <p className="text-sm font-medium mt-2 text-navy dark:text-white">
                  {lastLogin || "Não disponível"}
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* System Summary */}
          <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20">
            <CardHeader className="border-b border-gray-200 dark:border-gold/20">
              <CardTitle className="text-lg font-semibold text-navy dark:text-gold">
                Resumo do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-navy-light/20">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de clientes</p>
                  <p className="text-xl font-bold text-navy dark:text-white">{clientUsers.length}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-navy-light/20">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de documentos</p>
                  <p className="text-xl font-bold text-navy dark:text-white">{documents.length}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-navy-light/20">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Espaço utilizado</p>
                  <p className="text-xl font-bold text-navy dark:text-white">{totalStorage}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-navy-light/20">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Versão da aplicação</p>
                  <p className="text-xl font-bold text-navy dark:text-white">1.0.0</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Recent Documents */}
          <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20">
            <CardHeader className="border-b border-gray-200 dark:border-gold/20">
              <CardTitle className="text-lg font-semibold text-navy dark:text-gold">
                Últimos documentos enviados
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gold/20">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Documento</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data de envio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gold/20">
                    {recentDocuments.length > 0 ? (
                      recentDocuments.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-navy-light/10">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-navy dark:text-white">{doc.userName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{doc.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatRecentDate(doc.uploaded_at)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          Nenhum documento recente encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
