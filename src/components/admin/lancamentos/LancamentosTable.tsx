import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileSpreadsheet } from "lucide-react";

interface Lancamento {
  id: string;
  data: string | null;
  historico: string | null;
  debito: string | null;
  credito: string | null;
  valor: number | null;
  created_at: string;
}

interface LancamentosTableProps {
  lancamentos: Lancamento[];
  isLoading?: boolean;
}

export const LancamentosTable = ({ lancamentos, isLoading }: LancamentosTableProps) => {
  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-pulse text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  if (lancamentos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
          <FileSpreadsheet className="w-5 h-5 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground text-sm">Nenhum lançamento alinhado</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Os lançamentos aparecerão aqui após o alinhamento
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-muted/20">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Data</th>
            <th className="py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Histórico</th>
            <th className="py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Débito</th>
            <th className="py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Crédito</th>
            <th className="py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide text-right">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {lancamentos.map((lancamento, index) => (
            <motion.tr
              key={lancamento.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.015 }}
              className="hover:bg-muted/30 transition-colors"
            >
              <td className="py-3 px-4 text-foreground whitespace-nowrap">
                {formatDate(lancamento.data)}
              </td>
              <td className="py-3 px-4 text-foreground max-w-[250px] truncate">
                {lancamento.historico || '-'}
              </td>
              <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                {lancamento.debito || '-'}
              </td>
              <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                {lancamento.credito || '-'}
              </td>
              <td className="py-3 px-4 text-right font-medium text-foreground whitespace-nowrap">
                {formatCurrency(lancamento.valor)}
              </td>
            </motion.tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted/40">
            <td colSpan={4} className="py-3 px-4 font-medium text-foreground text-sm">
              Total ({lancamentos.length} lançamentos)
            </td>
            <td className="py-3 px-4 text-right font-bold text-foreground">
              {formatCurrency(lancamentos.reduce((sum, l) => sum + (l.valor || 0), 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
