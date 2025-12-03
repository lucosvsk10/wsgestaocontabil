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
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (lancamentos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileSpreadsheet className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">Nenhum lançamento alinhado</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Os lançamentos aparecerão aqui após o alinhamento
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Data</th>
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Histórico</th>
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Débito</th>
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Crédito</th>
            <th className="text-right py-3 px-3 font-medium text-muted-foreground">Valor</th>
          </tr>
        </thead>
        <tbody>
          {lancamentos.map((lancamento, index) => (
            <motion.tr
              key={lancamento.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className="border-b border-border/50 hover:bg-muted/30 transition-colors"
            >
              <td className="py-3 px-3 text-foreground">
                {formatDate(lancamento.data)}
              </td>
              <td className="py-3 px-3 text-foreground max-w-[200px] truncate">
                {lancamento.historico || '-'}
              </td>
              <td className="py-3 px-3 text-foreground font-mono text-xs">
                {lancamento.debito || '-'}
              </td>
              <td className="py-3 px-3 text-foreground font-mono text-xs">
                {lancamento.credito || '-'}
              </td>
              <td className="py-3 px-3 text-right text-foreground font-medium">
                {formatCurrency(lancamento.valor)}
              </td>
            </motion.tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted/30">
            <td colSpan={4} className="py-3 px-3 font-medium text-foreground">
              Total ({lancamentos.length} lançamentos)
            </td>
            <td className="py-3 px-3 text-right font-bold text-foreground">
              {formatCurrency(lancamentos.reduce((sum, l) => sum + (l.valor || 0), 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};