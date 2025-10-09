import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FileText, CheckCircle2, XCircle, Calendar, Users, FolderOpen, Lock, Unlock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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

  useEffect(() => {
    fetchAllHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [selectedUser, selectedMonth, selectedStatus, userHistories]);

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

  // Obter lista de meses únicos para filtro
  const uniqueMonths = Array.from(
    new Set(
      userHistories.flatMap(u => 
        u.months.map(m => `${m.year}-${m.month}`)
      )
    )
  ).sort().reverse();

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
                      <div className="flex items-center gap-2">
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
    </div>
  );
};
