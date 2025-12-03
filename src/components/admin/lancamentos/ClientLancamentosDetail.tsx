import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, FileSpreadsheet, ClipboardList, User, Mail, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlanoContasModal } from "./PlanoContasModal";
import { LancamentosTable } from "./LancamentosTable";

interface Lancamento {
  id: string;
  data: string | null;
  historico: string | null;
  debito: string | null;
  credito: string | null;
  valor: number | null;
  created_at: string;
}

interface Fechamento {
  id: string;
  competencia: string;
  arquivo_excel_url?: string;
  arquivo_csv_url?: string;
  total_lancamentos: number;
  created_at: string;
}

interface ClientInfo {
  name: string;
  email: string;
}

interface ClientLancamentosDetailProps {
  clientId: string;
}

const MONTHS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

export const ClientLancamentosDetail = ({ clientId }: ClientLancamentosDetailProps) => {
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [fechamento, setFechamento] = useState<Fechamento | null>(null);
  const [hasPlanoContas, setHasPlanoContas] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlanoModalOpen, setIsPlanoModalOpen] = useState(false);
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  
  const competencia = `${selectedYear}-${selectedMonth}`;
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

  useEffect(() => {
    if (clientId) {
      fetchClientData();
    }
  }, [clientId, competencia]);

  const fetchClientData = async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', clientId)
        .single();
      
      setClientInfo(userData);

      const { data: lancamentosData } = await supabase
        .from('lancamentos_alinhados')
        .select('*')
        .eq('user_id', clientId)
        .eq('competencia', competencia)
        .order('data', { ascending: true });
      
      setLancamentos(lancamentosData || []);

      const { data: fechamentoData } = await supabase
        .from('fechamentos_exportados')
        .select('*')
        .eq('user_id', clientId)
        .eq('competencia', competencia)
        .maybeSingle();
      
      setFechamento(fechamentoData);

      const { count } = await supabase
        .from('planos_contas')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', clientId);
      
      setHasPlanoContas((count || 0) > 0);

    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 bg-muted/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {clientInfo?.name || 'Carregando...'}
              </h2>
              {clientInfo?.email && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  {clientInfo.email}
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={() => setIsPlanoModalOpen(true)}
            variant="outline"
            size="sm"
            className="shrink-0"
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            Plano de Contas
            {hasPlanoContas ? (
              <CheckCircle className="w-3.5 h-3.5 ml-2 text-green-500" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 ml-2 text-destructive" />
            )}
          </Button>
        </div>

        {/* Seletores */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Competência:</span>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32 h-9 bg-background border-0 shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-20 h-9 bg-background border-0 shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Fechamento Status */}
      {fechamento && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-5 mt-4 p-4 rounded-lg bg-green-500/5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Mês Fechado</p>
                <p className="text-xs text-muted-foreground">
                  {fechamento.total_lancamentos} lançamentos exportados
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {fechamento.arquivo_excel_url && (
                <a
                  href={fechamento.arquivo_excel_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-500/10 text-green-600 text-xs font-medium hover:bg-green-500/20 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Excel
                </a>
              )}
              {fechamento.arquivo_csv_url && (
                <a
                  href={fechamento.arquivo_csv_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </a>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Lançamentos */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-foreground text-sm flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            Lançamentos Alinhados
          </h3>
          <Badge variant="secondary" className="text-xs">
            {lancamentos.length} registros
          </Badge>
        </div>
        
        <LancamentosTable lancamentos={lancamentos} isLoading={isLoading} />
      </div>

      {/* Modal */}
      <PlanoContasModal
        isOpen={isPlanoModalOpen}
        onClose={() => {
          setIsPlanoModalOpen(false);
          fetchClientData();
        }}
        clientId={clientId}
        clientName={clientInfo?.name || ''}
      />
    </div>
  );
};
