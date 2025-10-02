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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Histórico de Lançamentos
          </CardTitle>
          <CardDescription>
            Visualize todos os seus uploads e status de fechamento por mês
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum lançamento registrado ainda.
            </p>
          ) : (
            history.map((monthData, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  monthData.isClosed ? 'bg-green-50' : 'bg-yellow-50'
                }`}
              >
                {/* Cabeçalho do mês */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    <h3 className="font-semibold text-lg">
                      {formatMonthYear(monthData.month, monthData.year)}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {monthData.isClosed ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-700">Fechado</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-yellow-600" />
                        <span className="font-medium text-yellow-700">Em Aberto</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Informação de fechamento */}
                {monthData.isClosed && monthData.closedAt && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Fechado em: {format(new Date(monthData.closedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}

                {/* Lista de arquivos */}
                {monthData.uploads.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Arquivos ({monthData.uploads.length}):
                    </p>
                    {monthData.uploads.map((upload) => (
                      <div
                        key={upload.id}
                        className="flex items-start gap-3 bg-white p-3 rounded border"
                      >
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {upload.file_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Enviado em: {format(new Date(upload.upload_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhum arquivo enviado neste mês
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
