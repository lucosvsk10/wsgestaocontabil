
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle, FileText, Database, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface AdminDashboardViewProps {
  users: any[];
  supabaseUsers: any[];
  documents: any[];
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ 
  users,
  supabaseUsers,
  documents 
}) => {
  const { user } = useAuth();
  const [lastDocuments, setLastDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [storageSize, setStorageSize] = useState<number>(0);
  const [databaseSize, setDatabaseSize] = useState<number>(0);

  // Count clients (excluding admins)
  const clientCount = supabaseUsers.filter(authUser => {
    const userInfo = users.find(u => u.id === authUser.id);
    return !['fiscal', 'contabil', 'geral'].includes(userInfo?.role || '');
  }).length;

  // Get document count
  const documentCount = documents ? documents.length : 0;
  
  // Poll count (mock - would need to implement fetch from API)
  const pollCount = 5;

  // Get last login time
  const lastLogin = user?.last_sign_in_at ? 
    format(new Date(user.last_sign_in_at), "dd/MM/yyyy 'às' HH:mm", { locale: pt }) : 
    'Não disponível';

  // Format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Data desconhecida';
    try {
      return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: pt });
    } catch (error) {
      return 'Data inválida';
    }
  };

  // Calculate estimated storage size (500KB per document as an estimate)
  useEffect(() => {
    if (documents) {
      // Assuming average document size of 500KB
      const estimatedSize = documents.length * 0.5; // in MB
      setStorageSize(estimatedSize);
      
      // Mock database size (would need actual API to get this)
      setDatabaseSize(estimatedSize * 1.5); // Just a mock estimation
    }
  }, [documents]);

  // Get last 5 uploaded documents
  useEffect(() => {
    if (documents && documents.length > 0 && supabaseUsers.length > 0) {
      setIsLoading(true);
      
      const sortedDocs = [...documents].sort((a, b) => 
        new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
      ).slice(0, 5);
      
      const docsWithClientInfo = sortedDocs.map(doc => {
        const clientUser = supabaseUsers.find(u => u.id === doc.user_id);
        return {
          ...doc,
          clientName: clientUser?.user_metadata?.name || 'Usuário',
          clientEmail: clientUser?.email || 'Sem email'
        };
      });
      
      setLastDocuments(docsWithClientInfo);
      setIsLoading(false);
    }
  }, [documents, supabaseUsers]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-navy dark:text-gold">Dashboard</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Client Card */}
        <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3 mr-4">
              <UserCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Clientes Ativos</p>
              <h3 className="text-2xl font-bold text-navy dark:text-gold">{clientCount}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Document Card */}
        <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3 mr-4">
              <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Documentos</p>
              <h3 className="text-2xl font-bold text-navy dark:text-gold">{documentCount}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Polls Card */}
        <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-3 mr-4">
              <Database className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enquetes Criadas</p>
              <h3 className="text-2xl font-bold text-navy dark:text-gold">{pollCount}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Last Login Card */}
        <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3 mr-4">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Último Login</p>
              <h3 className="text-sm font-medium text-navy dark:text-gold">{lastLogin}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage Information */}
      <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-navy dark:text-gold">Informações de Armazenamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Espaço em Documentos</p>
              <p className="text-xl font-bold text-navy dark:text-gold">{storageSize.toFixed(2)} MB</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tamanho do Banco de Dados</p>
              <p className="text-xl font-bold text-navy dark:text-gold">{databaseSize.toFixed(2)} MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Latest Documents */}
      <Card className="bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-navy dark:text-gold">Últimos Documentos Enviados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : lastDocuments.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 font-medium text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2">
                <div>Cliente</div>
                <div>Documento</div>
                <div>Data de Upload</div>
              </div>
              {lastDocuments.map(doc => (
                <div key={doc.id} className="grid grid-cols-3 gap-4 text-sm">
                  <div className="font-medium text-navy dark:text-white">{doc.clientName}</div>
                  <div className="text-gray-700 dark:text-gray-300">{doc.name}</div>
                  <div className="text-gray-600 dark:text-gray-400">{formatDate(doc.uploaded_at)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              Nenhum documento encontrado
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
