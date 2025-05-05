
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Document } from "@/utils/auth/types";
import { formatDate } from "@/utils/documentUtils";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Check, Download, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDocumentActions } from "@/hooks/document/useDocumentActions";
import { useDocumentNotifications } from "@/hooks/useDocumentNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const NotificationsHistoryTable = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const [loadingDocumentIds, setLoadingDocumentIds] = useState<Set<string>>(new Set());
  
  // Create a refresh function for document fetching
  const refreshDocuments = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false });
      
      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar documentos",
        description: error.message || "Não foi possível carregar os documentos."
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initialize document notifications hook with our refresh function
  // Disable automatic refreshes by passing a no-op function to the hook
  // We'll manually call refreshDocuments when we need to
  const noopRefresh = () => {};
  const { markAllAsRead, isDocumentUnread } = useDocumentNotifications(noopRefresh);
  
  // Use document actions hook for download functionality
  // Pass our refresh function to update documents after download
  const { downloadDocument } = useDocumentActions(refreshDocuments);
  
  // Fetch documents only on component mount or when user changes
  useEffect(() => {
    if (user?.id) {
      refreshDocuments();
    }
  }, [user?.id]);
  
  // Handle document download
  const handleDownload = async (doc: Document) => {
    if (!doc.storage_key) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível baixar o documento: informações insuficientes."
      });
      return;
    }
    
    setLoadingDocumentIds(prev => new Set([...prev, doc.id]));
    
    try {
      await downloadDocument(
        doc.id,
        doc.storage_key,
        doc.filename || doc.original_filename || doc.name || "documento"
      );
      
      // Refresh documents to update UI
      refreshDocuments();
    } catch (error) {
      console.error("Error downloading document:", error);
    } finally {
      setLoadingDocumentIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(doc.id);
        return newSet;
      });
    }
  };
  
  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    refreshDocuments();
  };
  
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Histórico de Notificações</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-60 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-gold dark:text-gold">Histórico de Notificações</CardTitle>
        <Button 
          variant="outline" 
          onClick={handleMarkAllAsRead}
          className="border-gold/20 text-gold hover:bg-gold/20"
        >
          <Check size={16} className="mr-2" />
          Marcar todos como lidos
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-gold/20 overflow-hidden">
          <Table>
            <TableHeader className="bg-orange-300/50 dark:bg-navy-light/50">
              <TableRow>
                <TableHead className="text-navy dark:text-gold">Nome do Documento</TableHead>
                <TableHead className="text-navy dark:text-gold">Categoria</TableHead>
                <TableHead className="text-navy dark:text-gold">Data de Envio</TableHead>
                <TableHead className="text-navy dark:text-gold">Status</TableHead>
                <TableHead className="text-navy dark:text-gold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length > 0 ? (
                documents.map(doc => {
                  const unread = isDocumentUnread(doc.id);
                  const isLoading = loadingDocumentIds.has(doc.id);
                  
                  return (
                    <TableRow 
                      key={doc.id}
                      className={unread ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}
                    >
                      <TableCell className="font-medium">
                        {doc.name}
                      </TableCell>
                      <TableCell>{doc.category}</TableCell>
                      <TableCell>{formatDate(doc.uploaded_at)}</TableCell>
                      <TableCell>
                        <div className={`flex items-center ${
                          unread 
                            ? "text-blue-600 dark:text-blue-400" 
                            : "text-green-600 dark:text-green-400"
                        }`}>
                          {unread ? (
                            <>
                              <EyeOff size={16} className="mr-2" />
                              <span>Não visto</span>
                            </>
                          ) : (
                            <>
                              <Check size={16} className="mr-2" />
                              <span>Visualizado</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={isLoading}
                          onClick={() => handleDownload(doc)}
                          className="bg-orange-300/50 dark:bg-navy-light/50 border-gold/20 text-navy dark:text-gold hover:bg-gold hover:text-navy dark:hover:bg-gold-light dark:hover:text-navy flex items-center gap-1"
                        >
                          <Download size={14} />
                          <span className="truncate">{isLoading ? "Processando..." : "Baixar"}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-gray-500 dark:text-gray-400">
                    Não há documentos disponíveis
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
