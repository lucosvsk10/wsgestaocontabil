import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FileText, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export const UploadHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<MonthData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;

      try {
        // Buscar todos os uploads do usuário
        const { data: uploads } = await supabase
          .from('uploads')
          .select('*')
          .eq('user_id', user.id)
          .order('upload_date', { ascending: false });

        // Buscar todos os fechamentos de mês
        const { data: closures } = await supabase
          .from('month_closures')
          .select('*')
          .eq('user_id', user.id);

        // Agrupar uploads por mês
        const monthsMap = new Map<string, MonthData>();

        uploads?.forEach((upload) => {
          const key = `${upload.year}-${upload.month}`;
          if (!monthsMap.has(key)) {
            monthsMap.set(key, {
              month: upload.month,
              year: upload.year,
              isClosed: false,
              uploads: []
            });
          }
          monthsMap.get(key)!.uploads.push({
            id: upload.id,
            file_name: upload.file_name,
            upload_date: upload.upload_date
          });
        });

        // Adicionar informações de fechamento
        closures?.forEach((closure) => {
          const key = `${closure.year}-${closure.month}`;
          const monthData = monthsMap.get(key);
          if (monthData) {
            monthData.isClosed = true;
            monthData.closedAt = closure.closed_at;
          } else {
            // Mês fechado sem uploads
            monthsMap.set(key, {
              month: closure.month,
              year: closure.year,
              isClosed: true,
              closedAt: closure.closed_at,
              uploads: []
            });
          }
        });

        // Converter para array e ordenar
        const historyArray = Array.from(monthsMap.values()).sort((a, b) => {
          const dateA = new Date(a.year, parseInt(a.month.split('-')[1]) - 1);
          const dateB = new Date(b.year, parseInt(b.month.split('-')[1]) - 1);
          return dateB.getTime() - dateA.getTime();
        });

        setHistory(historyArray);
      } catch (error) {
        console.error('Erro ao buscar histórico:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const formatMonthYear = (month: string, year: number) => {
    const [yearStr, monthStr] = month.split('-');
    const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1);
    return format(date, "MMMM 'de' yyyy", { locale: ptBR }).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p>Carregando histórico...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Título Principal */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Calendar className="w-8 h-8 text-[#F5C441]" />
          📊 Histórico de Lançamentos
        </h1>
        <p className="text-muted-foreground mt-2">
          Visualize todos os seus uploads e status de fechamento por mês
        </p>
      </div>

      <Card className="shadow-lg">
        <CardContent className="p-6">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">
                Nenhum lançamento registrado ainda.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Seus uploads aparecerão aqui após o primeiro envio.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {history.map((monthData, index) => (
                <div
                  key={index}
                  className={`border-2 rounded-xl p-6 transition-all hover:shadow-md ${
                    monthData.isClosed 
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                      : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
                  }`}
                >
                  {/* Cabeçalho do mês */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-4 border-b-2 border-current/10">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-6 h-6 text-primary" />
                      <h2 className="text-xl font-bold">
                        📅 {formatMonthYear(monthData.month, monthData.year)}
                      </h2>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                      monthData.isClosed 
                        ? 'bg-green-500 text-white' 
                        : 'bg-yellow-500 text-black'
                    }`}>
                      {monthData.isClosed ? (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-bold">✅ FECHADO</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5" />
                          <span className="font-bold">❌ EM ABERTO</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Informação de fechamento */}
                  {monthData.isClosed && monthData.closedAt && (
                    <div className="mb-4 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">
                        🔒 Fechado em: {format(new Date(monthData.closedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  )}

                  {/* Lista de arquivos */}
                  {monthData.uploads.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-muted-foreground mb-3">
                        📄 Arquivos enviados ({monthData.uploads.length}):
                      </p>
                      {monthData.uploads.map((upload) => (
                        <div
                          key={upload.id}
                          className="flex items-start gap-3 bg-white dark:bg-gray-800 p-4 rounded-lg border-l-4 border-[#F5C441] hover:shadow-sm transition-shadow"
                        >
                          <FileText className="w-5 h-5 text-[#F5C441] flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">
                              • {upload.file_name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              ⏰ Enviado em: {format(new Date(upload.upload_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-white/50 dark:bg-black/20 rounded-lg">
                      <p className="text-sm text-muted-foreground italic">
                        Nenhum arquivo enviado neste mês
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
