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
      // Get client info
      const { data: userData } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', clientId)
        .single();
      
      setClientInfo(userData);

      // Get aligned lancamentos for selected month from renamed table
      const { data: lancamentosData } = await supabase
        .from('lancamentos_alinhados')
        .select('*')
        .eq('user_id', clientId)
        .eq('competencia', competencia)
        .order('data', { ascending: true });
      
      setLancamentos(lancamentosData || []);

      // Get fechamento for selected month
      const { data: fechamentoData } = await supabase
        .from('fechamentos_exportados')
        .select('*')
        .eq('user_id', clientId)
        .eq('competencia', competencia)
        .maybeSingle();
      
      setFechamento(fechamentoData);

      // Check plano de contas
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
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header com info do cliente */}
      <div className="p-5 border-b border-border bg-muted/20">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
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
          </div>

          {/* Botão Plano de Contas destacado */}
          <Button
            onClick={() => setIsPlanoModalOpen(true)}
            variant={hasPlanoContas ? "outline" : "default"}
            className={!hasPlanoContas ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            Plano de Contas
            {hasPlanoContas ? (
              <Badge className="ml-2 bg-green-500/20 text-green-600 border-0">
                <CheckCircle className="w-3 h-3 mr-1" />
                OK
              </Badge>
            ) : (
              <Badge className="ml-2 bg-destructive/20 text-destructive border-0">
                <AlertCircle className="w-3 h-3 mr-1" />
                Pendente
              </Badge>
            )}
          </Button>
        </div>

        {/* Seletores de mês/ano */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Competência:</span>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24">
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

      {/* Status do fechamento */}
      {fechamento && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 border-b border-border bg-green-500/5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-foreground">Mês Fechado</p>
                <p className="text-sm text-muted-foreground">
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
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 text-green-600 text-sm font-medium hover:bg-green-500/20 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel
                </a>
              )}
              {fechamento.arquivo_csv_url && (
                <a
                  href={fechamento.arquivo_csv_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </a>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabela de lançamentos alinhados */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-foreground flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            Lançamentos Alinhados
          </h3>
          <Badge variant="outline" className="text-muted-foreground">
            {lancamentos.length} registros
          </Badge>
        </div>
        
        <LancamentosTable lancamentos={lancamentos} isLoading={isLoading} />
      </div>

      {/* Modal do Plano de Contas */}
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