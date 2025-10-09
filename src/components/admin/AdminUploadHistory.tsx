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
}

interface ProcessedMonthData {
  month: string;
  year: number;
  documents: ProcessedDocument[];
}

interface ProcessedUserHistory {
  user_id: string;
  user_name: string;
  user_email: string;
  months: { [key: string]: ProcessedMonthData };
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
      const { data: documents, error } = await supabase
        .from('documents')
        .select(`
          id,
          name,
          category,
          uploaded_at,
          drive_url,
          observations,
          user_id,
          users:user_id (
            name,
            email
          )
        `)
        .not('drive_url', 'is', null)
        .eq('status', 'active')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      if (!documents) {
        setProcessedHistories([]);
        return;
      }

      // Agrupar documentos por usuário
      const grouped: { [key: string]: ProcessedUserHistory } = {};
      
      documents.forEach((doc: any) => {
        const userData = doc.users;
        if (!userData) return;

        // Extrair mês e ano das observations ou do name
        let year: number;
        let month: string;
        
        // Tentar extrair de observations primeiro: "Período: 2025-01"
        const obsMatch = doc.observations?.match(/Período:\s*(\d{4})-(\d{2})/);
        if (obsMatch) {
          year = parseInt(obsMatch[1]);
          month = obsMatch[2];
        } else {
          // Tentar extrair do name: "Fechamento | teste | 2025-01"
          const nameMatch = doc.name?.match(/(\d{4})-(\d{2})/);
          if (nameMatch) {
            year = parseInt(nameMatch[1]);
            month = nameMatch[2];
          } else {
            // Fallback: usar data do upload
            const uploadDate = new Date(doc.uploaded_at);
            year = uploadDate.getFullYear();
            month = String(uploadDate.getMonth() + 1).padStart(2, '0');
          }
        }

        // Extrair tipo do documento (Fechamento, Relatório, etc.)
        const docType = doc.name?.split('|')[0]?.trim() || 'Documento';

        if (!grouped[doc.user_id]) {
          grouped[doc.user_id] = {
            user_id: doc.user_id,
            user_name: userData.name,
            user_email: userData.email,
            months: {}
          };
        }

        const monthKey = `${year}-${month}`;
        if (!grouped[doc.user_id].months[monthKey]) {
          grouped[doc.user_id].months[monthKey] = {
            month: month,
            year: year,
            documents: []
          };
        }

        grouped[doc.user_id].months[monthKey].documents.push({
          id: doc.id,
          file_name: doc.name,
          file_url: doc.drive_url,
          doc_type: docType,
          upload_date: doc.uploaded_at,
          month: month,
          year: year
        });
      });

      const processedArray = Object.values(grouped);
      setProcessedHistories(processedArray);
      setFilteredProcessedHistories(processedArray);

      // Calcular estatísticas
      const totalDocs = documents.length;
      const totalUsers = processedArray.length;
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const docsThisMonth = documents.filter((doc: any) => {
        const uploadDate = new Date(doc.uploaded_at);
        return uploadDate.getMonth() + 1 === currentMonth && uploadDate.getFullYear() === currentYear;
      }).length;
      
      const docTypes = [...new Set(documents.map((doc: any) => {
        const docType = doc.name?.split('|')[0]?.trim() || 'Documento';
        return docType;
      }))].length;

      setProcessedStats({
        totalDocuments: totalDocs,
        totalUsers: totalUsers,
        documentsThisMonth: docsThisMonth,
        documentTypes: docTypes
      });

    } catch (error) {
      console.error('Erro ao buscar documentos processados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os documentos processados.",
        variant: "destructive",
      });
    }
  };

  const applyProcessedFilters = () => {
    let filtered = [...processedHistories];

    // Filtrar por usuário
    if (selectedProcessedUser !== "all") {
      filtered = filtered.filter(h => h.user_id === selectedProcessedUser);
    }

    // Filtrar por período
    if (selectedProcessedPeriod !== "all") {
      filtered = filtered.map(userHistory => ({
        ...userHistory,
        months: Object.keys(userHistory.months).reduce((acc, key) => {
          if (key === selectedProcessedPeriod) {
            acc[key] = userHistory.months[key];
          }
          return acc;
        }, {} as { [key: string]: ProcessedMonthData })
      })).filter(h => Object.keys(h.months).length > 0);
    }

    // Filtrar por tipo de documento
    if (selectedDocType !== "all") {
      filtered = filtered.map(userHistory => ({
        ...userHistory,
        months: Object.keys(userHistory.months).reduce((acc, key) => {
          const month = userHistory.months[key];
          const filteredDocs = month.documents.filter(doc => doc.doc_type === selectedDocType);
          if (filteredDocs.length > 0) {
            acc[key] = { ...month, documents: filteredDocs };
          }
          return acc;
        }, {} as { [key: string]: ProcessedMonthData })
      })).filter(h => Object.keys(h.months).length > 0);
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
        Object.keys(u.months)
      )
    )
  ).sort().reverse();

  // Obter lista de tipos de documento únicos
  const uniqueDocTypes = Array.from(
    new Set(
      processedHistories.flatMap(u => 
        Object.values(u.months).flatMap(m => m.documents.map(d => d.doc_type))
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
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.user_name} ({user.user_email})
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
                <Card key={userHistory.user_id} className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-[#F5C441]/20 to-transparent">
                    <CardTitle className="flex items-center gap-3">
                      <Users className="w-6 h-6 text-[#F5C441]" />
                      <div>
                        <div className="text-xl">{userHistory.user_name}</div>
                        <div className="text-sm font-normal text-muted-foreground">
                          {userHistory.user_email}
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {Object.values(userHistory.months).map((monthData, idx) => (
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
                                onClick={() => {
                                  // Extrair o ID do arquivo do Google Drive
                                  const fileIdMatch = doc.file_url.match(/\/d\/([^/]+)/);
                                  if (fileIdMatch) {
                                    const fileId = fileIdMatch[1];
                                    // URL de download direto do Google Drive
                                    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
                                    window.open(downloadUrl, '_blank');
                                  } else {
                                    // Fallback: abrir URL original
                                    window.open(doc.file_url, '_blank');
                                  }
                                }}
                                className="shrink-0"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Baixar documento
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
