import { useState, useEffect } from "react";
import { ChevronDown, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export const MonthHistory = ({ userId }: MonthHistoryProps) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase
        .from('fechamentos_exportados')
        .select('*')
        .eq('user_id', userId)
        .order('competencia', { ascending: false })
        .limit(12);

      if (data) setHistory(data);
    };
    fetchHistory();
  }, [userId]);

  if (history.length === 0) return null;

  const formatCompetencia = (comp: string) => {
    const [year, month] = comp.split('-');
    return { month: MONTHS[parseInt(month) - 1], year };
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="pt-4 border-t border-border/30">
      <CollapsibleTrigger className="w-full flex items-center justify-between py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <span>Histórico</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-2">
        <div className="space-y-0.5">
          {history.map(item => {
            const { month, year } = formatCompetencia(item.competencia);
            
            return (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm text-foreground">{month}</span>
                  <span className="text-xs text-muted-foreground">{year}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {item.total_lancamentos}
                  </span>
                  
                  {item.arquivo_excel_url && (
                    <a
                      href={item.arquivo_excel_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      title="Excel"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
