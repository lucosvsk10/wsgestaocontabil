
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, HardDrive, Clock } from "lucide-react";
import { useStorageStats } from "@/hooks/useStorageStats";
import { useAuth } from "@/contexts/AuthContext";
import { Document } from "@/utils/auth/types";
import { formatDate } from "../utils/dateUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AdminDashboardViewProps {
  users: any[];
  supabaseUsers: any[];
  documents: Document[];
}

export const AdminDashboardView = ({ users, supabaseUsers, documents }: AdminDashboardViewProps) => {
  const { storageStats, isLoading: isLoadingStorage, fetchStorageStats } = useStorageStats();
  const { user, session } = useAuth();
  
  useEffect(() => {
    fetchStorageStats();
  }, [fetchStorageStats]);

  // Get the 5 most recent documents
  const recentDocuments = [...documents].sort((a, b) => {
    return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
  }).slice(0, 5);
  
  // Calculate documents by category
  const documentsByCategory: Record<string, number> = {};
  documents.forEach(doc => {
    if (!documentsByCategory[doc.category]) {
      documentsByCategory[doc.category] = 0;
    }
    documentsByCategory[doc.category]++;
  });

  // Get user info for a document
  const getUserInfo = (userId: string) => {
    const authUser = supabaseUsers.find(user => user.id === userId);
    return {
      name: authUser?.user_metadata?.name || "Usuário",
      email: authUser?.email || "Sem email"
    };
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-navy dark:text-gold">Painel de Controle</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Clients Card */}
        <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Cadastrados</CardTitle>
            <Users size={18} className="text-navy dark:text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-navy dark:text-gold">
              {supabaseUsers?.filter(user => {
                const isAdmin = user.email === "wsgestao@gmail.com" || 
                                user.email === "l09022007@gmail.com" || 
                                (users.find(u => u.id === user.id)?.role === "admin");
                return !isAdmin;
              }).length || 0}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Total de clientes no sistema
            </p>
          </CardContent>
        </Card>
        
        {/* Documents Card */}
        <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos Armazenados</CardTitle>
            <FileText size={18} className="text-navy dark:text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-navy dark:text-gold">
              {documents?.length || 0}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Total de documentos no sistema
            </p>
          </CardContent>
        </Card>
        
        {/* Storage Card */}
        <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Espaço Total Usado</CardTitle>
            <HardDrive size={18} className="text-navy dark:text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-navy dark:text-gold">
              {isLoadingStorage ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                `${storageStats?.totalStorageMB.toFixed(2) || 0} MB`
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Armazenamento no Supabase
            </p>
          </CardContent>
        </Card>
        
        {/* Last Login Card */}
        <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último Login</CardTitle>
            <Clock size={18} className="text-navy dark:text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-md font-bold text-navy dark:text-gold">
              {session ? formatDate(session.created_at) : "N/A"}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {user?.email || "Administrator"}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Documents Table */}
      <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-navy dark:text-gold">Documentos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gold/20">
                <TableHead className="text-navy dark:text-gold">Cliente</TableHead>
                <TableHead className="text-navy dark:text-gold">Documento</TableHead>
                <TableHead className="text-navy dark:text-gold">Categoria</TableHead>
                <TableHead className="text-navy dark:text-gold">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentDocuments.length > 0 ? (
                recentDocuments.map((doc) => {
                  const userInfo = getUserInfo(doc.user_id);
                  return (
                    <TableRow key={doc.id} className="border-gold/20">
                      <TableCell className="font-medium">{userInfo.name}</TableCell>
                      <TableCell>{doc.name}</TableCell>
                      <TableCell>{doc.category}</TableCell>
                      <TableCell>{formatDate(doc.uploaded_at)}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-navy/60 dark:text-white/60">
                    Nenhum documento recente
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Document Categories */}
      <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-navy dark:text-gold">Documentos por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(documentsByCategory).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(documentsByCategory).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-navy dark:text-white">{category}</span>
                  <div className="flex items-center gap-2">
                    <div className="bg-navy dark:bg-gold h-3 rounded-full" style={{ 
                      width: `${Math.max(20, (count / documents.length) * 200)}px`
                    }}></div>
                    <span className="text-navy dark:text-gold text-sm font-medium">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-navy/60 dark:text-white/60">
              Nenhuma categoria encontrada
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
