import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FileText, CheckCircle2, XCircle, Calendar, Users, FolderOpen, Lock, Unlock, Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Upload {
  id: string;
  file_name: string;
  upload_date: string;
}

interface MonthData {
  month: string;
  year: number;
  isClosed: boolean;
  closedAt?: string;
  uploads: Upload[];
}

interface UserHistory {
  userId: string;
  userName: string;
  userEmail: string;
  months: MonthData[];
}

interface Stats {
  totalUsers: number;
  totalFiles: number;
  closedMonths: number;
  openMonths: number;
}

interface ProcessedDocument {
  id: string;
  file_name: string;
  doc_type: string;
  month: string;
  year: number;
  upload_date: string;
  file_url: string;
  user_id: string;
  user_name: string;
  user_email: string;
  processing_status?: string;
  protocol_id?: string;
}

interface ProcessedMonthData {
  month: string;
  year: number;
  documents: ProcessedDocument[];
}

interface ProcessedUserHistory {
  userId: string;
  userName: string;
  userEmail: string;
  months: ProcessedMonthData[];
}

interface ProcessedStats {
  totalDocuments: number;
  totalUsers: number;
  documentsThisMonth: number;
  documentTypes: number;
}

export const AdminUploadHistory = () => {
  const { toast } = useToast();
  const [userHistories, setUserHistories] = useState<UserHistory[]>([]);
  const [filteredHistories, setFilteredHistories] = useState<UserHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalFiles: 0,
    closedMonths: 0,
    openMonths: 0
  });

  // Estados para lançamentos processados
  const [processedHistories, setProcessedHistories] = useState<ProcessedUserHistory[]>([]);
  const [filteredProcessedHistories, setFilteredProcessedHistories] = useState<ProcessedUserHistory[]>([]);
  const [selectedProcessedUser, setSelectedProcessedUser] = useState<string>("all");
  const [selectedProcessedPeriod, setSelectedProcessedPeriod] = useState<string>("all");
  const [selectedDocType, setSelectedDocType] = useState<string>("all");
  const [processedStats, setProcessedStats] = useState<ProcessedStats>({
    totalDocuments: 0,
    totalUsers: 0,
    documentsThisMonth: 0,
    documentTypes: 0
  });

  useEffect(() => {
    fetchAllHistory();
    fetchProcessedDocuments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [selectedUser, selectedMonth, selectedStatus, userHistories]);

  useEffect(() => {
    applyProcessedFilters();
  }, [selectedProcessedUser, selectedProcessedPeriod, selectedDocType, processedHistories]);

  const fetchAllHistory = async () => {
    try {
      // Buscar TODOS os uploads
      const { data: uploads } = await supabase
        .from('uploads')
        .select('*')
        .order('upload_date', { ascending: false });

      // Buscar TODOS os fechamentos
      const { data: closures } = await supabase
        .from('month_closures')
        .select('*');

      // Agrupar por usuário
      const usersMap = new Map<string, UserHistory>();

      uploads?.forEach((upload) => {
        if (!usersMap.has(upload.user_id)) {
          usersMap.set(upload.user_id, {
            userId: upload.user_id,
            userName: upload.user_name,
            userEmail: upload.user_email,
            months: []
          });
        }

        const userHistory = usersMap.get(upload.user_id)!;
        const monthKey = `${upload.year}-${upload.month}`;
        
        let monthData = userHistory.months.find(m => `${m.year}-${m.month}` === monthKey);
        if (!monthData) {
          monthData = {
            month: upload.month,
            year: upload.year,
            isClosed: false,
            uploads: []
          };
          userHistory.months.push(monthData);
        }

        monthData.uploads.push({
          id: upload.id,
          file_name: upload.file_name,
          upload_date: upload.upload_date
        });
      });

      // Adicionar informações de fechamento
      closures?.forEach((closure) => {
        const userHistory = usersMap.get(closure.user_id);
        if (userHistory) {
          const monthKey = `${closure.year}-${closure.month}`;
          let monthData = userHistory.months.find(m => `${m.year}-${m.month}` === monthKey);
          
          if (monthData) {
            monthData.isClosed = true;
            monthData.closedAt = closure.closed_at;
          } else {
            // Mês fechado sem uploads
            userHistory.months.push({
              month: closure.month,
              year: closure.year,
              isClosed: true,
              closedAt: closure.closed_at,
              uploads: []
            });
          }
        }
      });

      // Ordenar meses de cada usuário
      usersMap.forEach((userHistory) => {
        userHistory.months.sort((a, b) => {
          const dateA = new Date(a.year, parseInt(a.month.split('-')[1]) - 1);
          const dateB = new Date(b.year, parseInt(b.month.split('-')[1]) - 1);
          return dateB.getTime() - dateA.getTime();
        });
      });

      const histories = Array.from(usersMap.values());
      setUserHistories(histories);

      // Calcular estatísticas
      const totalFiles = uploads?.length || 0;
      const closedMonthsSet = new Set<string>();
      const openMonthsSet = new Set<string>();

      histories.forEach(user => {
        user.months.forEach(month => {
          const key = `${user.userId}-${month.year}-${month.month}`;
          if (month.isClosed) {
            closedMonthsSet.add(key);
          } else {
            openMonthsSet.add(key);
          }
        });
      });

      setStats({
        totalUsers: histories.length,
        totalFiles,
        closedMonths: closedMonthsSet.size,
        openMonths: openMonthsSet.size
      });

    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProcessedDocuments = async () => {
    try {
      // Buscar TODOS os documentos processados
      const { data: documents } = await supabase
        .from('processed_documents')
        .select('*')
        .order('upload_date', { ascending: false });

      // Agrupar por usuário
      const usersMap = new Map<string, ProcessedUserHistory>();

      documents?.forEach((doc) => {
        if (!usersMap.has(doc.user_id)) {
          usersMap.set(doc.user_id, {
            userId: doc.user_id,
            userName: doc.user_name,
            userEmail: doc.user_email,
            months: []
          });
        }

        const userHistory = usersMap.get(doc.user_id)!;
        const monthKey = `${doc.year}-${doc.month}`;
        
        let monthData = userHistory.months.find(m => `${m.year}-${m.month}` === monthKey);
        if (!monthData) {
          monthData = {
            month: doc.month,
            year: doc.year,
            documents: []
          };
          userHistory.months.push(monthData);
        }

        monthData.documents.push(doc);
      });

      // Ordenar meses de cada usuário
      usersMap.forEach((userHistory) => {
        userHistory.months.sort((a, b) => {
          const dateA = new Date(a.year, parseInt(a.month) - 1);
          const dateB = new Date(b.year, parseInt(b.month) - 1);
          return dateB.getTime() - dateA.getTime();
        });
      });

      const histories = Array.from(usersMap.values());
      setProcessedHistories(histories);

      // Calcular estatísticas
      const totalDocuments = documents?.length || 0;
      const uniqueUsers = new Set(documents?.map(d => d.user_id) || []).size;
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const documentsThisMonth = documents?.filter(d => 
        d.year === currentYear && parseInt(d.month) === currentMonth
      ).length || 0;
      const uniqueDocTypes = new Set(documents?.map(d => d.doc_type) || []).size;

      setProcessedStats({
        totalDocuments,
        totalUsers: uniqueUsers,
        documentsThisMonth,
        documentTypes: uniqueDocTypes
      });

    } catch (error) {
      console.error('Erro ao buscar documentos processados:', error);
    }
  };

  const applyProcessedFilters = () => {
    let filtered = [...processedHistories];

    // Filtrar por usuário
    if (selectedProcessedUser !== "all") {
      filtered = filtered.filter(h => h.userId === selectedProcessedUser);
    }

    // Filtrar por período
    if (selectedProcessedPeriod !== "all") {
      filtered = filtered.map(userHistory => ({
        ...userHistory,
        months: userHistory.months.filter(month => 
          `${month.year}-${month.month}` === selectedProcessedPeriod
        )
      })).filter(h => h.months.length > 0);
    }

    // Filtrar por tipo de documento
    if (selectedDocType !== "all") {
      filtered = filtered.map(userHistory => ({
        ...userHistory,
        months: userHistory.months.map(month => ({
          ...month,
          documents: month.documents.filter(doc => doc.doc_type === selectedDocType)
        })).filter(m => m.documents.length > 0)
      })).filter(h => h.months.length > 0);
    }

    setFilteredProcessedHistories(filtered);
  };

  const applyFilters = () => {
    let filtered = [...userHistories];

    // Filtrar por usuário
    if (selectedUser !== "all") {
      filtered = filtered.filter(h => h.userId === selectedUser);
    }

    // Filtrar por mês ou status
    if (selectedMonth !== "all" || selectedStatus !== "all") {
      filtered = filtered.map(userHistory => ({
        ...userHistory,
        months: userHistory.months.filter(month => {
          const matchMonth = selectedMonth === "all" || `${month.year}-${month.month}` === selectedMonth;
          const matchStatus = selectedStatus === "all" || 
            (selectedStatus === "closed" && month.isClosed) ||
            (selectedStatus === "open" && !month.isClosed);
          return matchMonth && matchStatus;
        })
      })).filter(h => h.months.length > 0); // Remover usuários sem meses após filtro
    }

    setFilteredHistories(filtered);
  };

  const formatMonthYear = (month: string, year: number) => {
    const [yearStr, monthStr] = month.split('-');
    const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1);
    return format(date, "MMMM 'de' yyyy", { locale: ptBR }).toUpperCase();
  };

  const handleReopenMonth = async (userId: string, month: string, year: number) => {
    try {
      const { error } = await supabase
        .from('month_closures')
        .delete()
        .eq('user_id', userId)
        .eq('month', month)
        .eq('year', year);

      if (error) throw error;

      toast({
        title: "Mês reaberto com sucesso!",
        description: `O mês ${month} foi reaberto para edição.`,
      });

      // Recarregar os dados
      fetchAllHistory();
    } catch (error) {
      console.error('Erro ao reabrir mês:', error);
      toast({
        title: "Erro ao reabrir mês",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadMonth = async (userId: string, userName: string, month: string, year: number) => {
    try {
      toast({
        title: "Iniciando download...",
        description: "Buscando documentos processados do mês.",
      });

      // Buscar documentos processados deste mês
      const { data: documents, error } = await supabase
        .from('processed_documents')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month)
        .eq('year', year);

      if (error) throw error;

      if (!documents || documents.length === 0) {
        toast({
          title: "Nenhum documento encontrado",
          description: "Não há documentos processados para este período.",
          variant: "destructive"
        });
        return;
      }

      // Baixar cada arquivo
      let successCount = 0;
      let errorCount = 0;

      for (const doc of documents) {
        try {
          // Baixar o arquivo do storage
          const { data: fileData, error: downloadError } = await supabase
            .storage
            .from(doc.storage_key.split('/')[0])
            .download(doc.storage_key.split('/').slice(1).join('/'));

          if (downloadError) throw downloadError;

          // Criar link de download
          const url = URL.createObjectURL(fileData);
          const link = document.createElement('a');
          link.href = url;
          link.download = doc.file_name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          successCount++;
          
          // Aguardar um pouco entre downloads para não sobrecarregar
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error('Erro ao baixar arquivo:', doc.file_name, err);
          errorCount++;
        }
      }

      toast({
        title: "Download concluído!",
        description: `${successCount} arquivo(s) baixado(s) com sucesso. ${errorCount > 0 ? `${errorCount} erro(s).` : ''}`,
      });

    } catch (error) {
      console.error('Erro ao baixar documentos do mês:', error);
      toast({
        title: "Erro ao baixar documentos",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    }
  };

  // Obter lista de meses únicos para filtro
  const uniqueMonths = Array.from(
    new Set(
      userHistories.flatMap(u => 
        u.months.map(m => `${m.year}-${m.month}`)
      )
    )
  ).sort().reverse();

  // Obter lista de períodos únicos para filtro de processados
  const uniqueProcessedPeriods = Array.from(
    new Set(
      processedHistories.flatMap(u => 
        u.months.map(m => `${m.year}-${String(m.month).padStart(2, '0')}`)
      )
    )
  ).sort().reverse();

  // Obter lista de tipos de documento únicos
  const uniqueDocTypes = Array.from(
    new Set(
      processedHistories.flatMap(u => 
        u.months.flatMap(m => m.documents.map(d => d.doc_type))
      )
    )
  ).sort();

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p>Carregando histórico geral...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Título Principal */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="w-8 h-8 text-[#F5C441]" />
          Histórico Geral - Todos os Usuários
        </h1>
        <p className="text-muted-foreground mt-2">
          Visualização administrativa de todos os uploads e fechamentos de mês
        </p>
      </div>

      {/* Sistema de Abas */}
      <Tabs defaultValue="uploads" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="uploads">Uploads Manuais</TabsTrigger>
          <TabsTrigger value="processed">Lançamentos Drive</TabsTrigger>
        </TabsList>

        {/* Aba de Uploads Manuais */}
        <TabsContent value="uploads" className="space-y-6">
          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#F5C441]" />
                  Usuários Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-[#F5C441]" />
                  Total de Arquivos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalFiles}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4 text-green-600 dark:text-green-400" />
                  Meses Fechados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.closedMonths}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Unlock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  Meses em Aberto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.openMonths}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Usuário</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os usuários" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os usuários</SelectItem>
                      {userHistories.map((user) => (
                        <SelectItem key={user.userId} value={user.userId}>
                          {user.userName} ({user.userEmail})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Período</label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os períodos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os períodos</SelectItem>
                      {uniqueMonths.map((month) => {
                        const [year, monthStr] = month.split('-');
                        const date = new Date(parseInt(year), parseInt(monthStr) - 1);
                        return (
                          <SelectItem key={month} value={month}>
                            {format(date, "MMMM/yyyy", { locale: ptBR })}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="closed">Apenas Fechados</SelectItem>
                      <SelectItem value="open">Apenas Em Aberto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de históricos */}
          <div className="space-y-6">
            {filteredHistories.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground">
                    Nenhum registro encontrado com os filtros selecionados.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredHistories.map((userHistory) => (
                <Card key={userHistory.userId} className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-[#F5C441]/20 to-transparent">
                    <CardTitle className="flex items-center gap-3">
                      <Users className="w-6 h-6 text-[#F5C441]" />
                      <div>
                        <div className="text-xl">{userHistory.userName}</div>
                        <div className="text-sm font-normal text-muted-foreground">
                          {userHistory.userEmail}
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {userHistory.months.map((monthData, idx) => (
                      <div
                        key={idx}
                        className={`border-2 rounded-xl p-6 ${
                          monthData.isClosed 
                            ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                            : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
                        }`}
                      >
                        {/* Cabeçalho do mês */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-4 border-b-2 border-current/10">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5" />
                            <h3 className="text-lg font-bold">
                              {formatMonthYear(monthData.month, monthData.year)}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                              monthData.isClosed 
                                ? 'bg-green-500 text-white' 
                                : 'bg-yellow-500 text-black'
                            }`}>
                              {monthData.isClosed ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span className="font-bold text-sm">FECHADO</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4" />
                                  <span className="font-bold text-sm">EM ABERTO</span>
                                </>
                              )}
                            </div>
                            
                            {/* Botão de Download por Mês */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadMonth(userHistory.userId, userHistory.userName, monthData.month, monthData.year)}
                              className="bg-blue-500 hover:bg-blue-600 text-white border-0"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Baixar Mês
                            </Button>
                            
                            {monthData.isClosed && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-yellow-500 hover:bg-yellow-600 text-black border-0"
                                  >
                                    <Unlock className="w-4 h-4 mr-2" />
                                    Reabrir
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar reabertura do mês</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja reabrir o mês {monthData.month} para {userHistory.userName}? 
                                      O cliente poderá fazer novos uploads neste período.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleReopenMonth(userHistory.userId, monthData.month, monthData.year)}
                                      className="bg-[#F5C441] hover:bg-[#F5C441]/90 text-black"
                                    >
                                      Confirmar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>

                        {/* Data de fechamento */}
                        {monthData.isClosed && monthData.closedAt && (
                          <div className="mb-4 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                            <p className="text-sm font-medium text-green-700 dark:text-green-400">
                              Fechado em: {format(new Date(monthData.closedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        )}

                        {/* Lista de arquivos */}
                        {monthData.uploads.length > 0 ? (
                          <div className="space-y-3">
                            <p className="text-sm font-semibold text-muted-foreground mb-3">
                              Arquivos enviados ({monthData.uploads.length}):
                            </p>
                            {monthData.uploads.map((upload) => (
                              <div
                                key={upload.id}
                                className="flex items-start gap-3 bg-white dark:bg-gray-800 p-4 rounded-lg border-l-4 border-[#F5C441]"
                              >
                                <FileText className="w-5 h-5 text-[#F5C441] flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold truncate">
                                    {upload.file_name}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Enviado em: {format(new Date(upload.upload_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 bg-white/50 dark:bg-black/20 rounded-lg">
                            <p className="text-sm text-muted-foreground italic">
                              Nenhum arquivo enviado neste mês
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Aba de Lançamentos Processados */}
        <TabsContent value="processed" className="space-y-6">
          {/* Estatísticas de Processados */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#F5C441]" />
                  Total de Documentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{processedStats.totalDocuments}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#F5C441]" />
                  Usuários com Lançamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{processedStats.totalUsers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#F5C441]" />
                  Documentos Este Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{processedStats.documentsThisMonth}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-[#F5C441]" />
                  Tipos de Documentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{processedStats.documentTypes}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros de Processados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Usuário</label>
                  <Select value={selectedProcessedUser} onValueChange={setSelectedProcessedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os usuários" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os usuários</SelectItem>
                      {processedHistories.map((user) => (
                        <SelectItem key={user.userId} value={user.userId}>
                          {user.userName} ({user.userEmail})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Período</label>
                  <Select value={selectedProcessedPeriod} onValueChange={setSelectedProcessedPeriod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os períodos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os períodos</SelectItem>
                      {uniqueProcessedPeriods.map((period) => {
                        const [year, monthStr] = period.split('-');
                        const date = new Date(parseInt(year), parseInt(monthStr) - 1);
                        return (
                          <SelectItem key={period} value={period}>
                            {format(date, "MMMM/yyyy", { locale: ptBR })}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Documento</label>
                  <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      {uniqueDocTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de lançamentos processados */}
          <div className="space-y-6">
            {filteredProcessedHistories.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground">
                    Nenhum documento processado encontrado com os filtros selecionados.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredProcessedHistories.map((userHistory) => (
                <Card key={userHistory.userId} className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-[#F5C441]/20 to-transparent">
                    <CardTitle className="flex items-center gap-3">
                      <Users className="w-6 h-6 text-[#F5C441]" />
                      <div>
                        <div className="text-xl">{userHistory.userName}</div>
                        <div className="text-sm font-normal text-muted-foreground">
                          {userHistory.userEmail}
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {userHistory.months.map((monthData, idx) => (
                      <div
                        key={idx}
                        className="border-2 rounded-xl p-6 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
                      >
                        {/* Cabeçalho do mês */}
                        <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-current/10">
                          <Calendar className="w-5 h-5" />
                          <h3 className="text-lg font-bold">
                            {format(new Date(monthData.year, parseInt(monthData.month) - 1), "MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()}
                          </h3>
                          <span className="ml-auto text-sm font-semibold text-muted-foreground">
                            {monthData.documents.length} documento(s)
                          </span>
                        </div>

                        {/* Lista de documentos */}
                        <div className="space-y-3">
                          {monthData.documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-start gap-3 bg-white dark:bg-gray-800 p-4 rounded-lg border-l-4 border-blue-500"
                            >
                              <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">
                                  {doc.file_name}
                                </p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    {doc.doc_type}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(doc.upload_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(doc.file_url, '_blank')}
                                className="shrink-0"
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Abrir no Drive
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
