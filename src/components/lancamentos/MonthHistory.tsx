import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { History, FileSpreadsheet, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoryItem {
  id: string;
  competencia: string;
  arquivo_excel_url?: string;
  arquivo_csv_url?: string;
  total_lancamentos: number;
  created_at: string;
}

interface MonthHistoryProps {
  userId: string;
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Março',
  '04': 'Abril',
  '05': 'Maio',
  '06': 'Junho',
  '07': 'Julho',
  '08': 'Agosto',
  '09': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro',
};

export const MonthHistory = ({ userId }: MonthHistoryProps) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('fechamentos_exportados')
        .select('*')
        .eq('user_id', userId)
        .order('competencia', { ascending: false })
        .limit(12);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCompetencia = (competencia: string) => {
    const [year, month] = competencia.split('-');
    return `${MONTH_NAMES[month]} de ${year}`;
  };

  if (isLoading) return null;

  if (history.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 text-center">
        <History className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          Nenhum mês fechado ainda
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">
          Histórico de Fechamentos
        </h2>
      </div>

      <div className="grid gap-3">
        {history.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-4 bg-card rounded-xl border border-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {formatCompetencia(item.competencia)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.total_lancamentos} lançamentos • Fechado em {format(new Date(item.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {item.arquivo_excel_url && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.open(item.arquivo_excel_url, '_blank')}
                  title="Baixar Excel"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                </Button>
              )}
              {item.arquivo_csv_url && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.open(item.arquivo_csv_url, '_blank')}
                  title="Baixar CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
