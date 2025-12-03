import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileSpreadsheet, Download, ChevronDown, ChevronUp } from "lucide-react";
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
  '01': 'Jan',
  '02': 'Fev',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'Mai',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Set',
  '10': 'Out',
  '11': 'Nov',
  '12': 'Dez',
};

export const MonthHistory = ({ userId }: MonthHistoryProps) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

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
    return `${MONTH_NAMES[month]} ${year}`;
  };

  if (isLoading) return null;
  if (history.length === 0) return null;

  const displayItems = isExpanded ? history : history.slice(0, 3);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left px-1"
      >
        <h3 className="text-sm font-medium text-foreground">
          Histórico
        </h3>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {history.length} mês(es)
          {history.length > 3 && (
            isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
          )}
        </span>
      </button>

      <div className="space-y-1">
        {displayItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                {formatCompetencia(item.competencia)}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.total_lancamentos} lançamentos
              </p>
            </div>

            <div className="flex gap-1">
              {item.arquivo_excel_url && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => window.open(item.arquivo_excel_url, '_blank')}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                </Button>
              )}
              {item.arquivo_csv_url && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => window.open(item.arquivo_csv_url, '_blank')}
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
