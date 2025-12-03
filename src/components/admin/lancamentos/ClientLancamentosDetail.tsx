import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, FileSpreadsheet, ClipboardList, User, Mail, Calendar, CheckCircle, AlertCircle, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { PlanoContasModal } from "./PlanoContasModal";
import { LancamentosTable } from "./LancamentosTable";
import { toast } from "sonner";

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

interface Document {
  id: string;
  status_processamento: string;
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

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export const ClientLancamentosDetail = ({ clientId }: ClientLancamentosDetailProps) => {
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [fechamento, setFechamento] = useState<Fechamento | null>(null);
  const [hasPlanoContas, setHasPlanoContas] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
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

      // Fetch documents for this competencia
      const { data: docsData } = await supabase
        .from('documentos_brutos')
        .select('id, status_processamento')
        .eq('user_id', clientId)
        .eq('competencia', competencia);
      
      setDocuments(docsData || []);

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

  const handleCloseMonth = async () => {
    setIsClosing(true);
    
    try {
      const { error } = await supabase.functions.invoke('close-month', {
        body: { user_id: clientId, competencia }
      });

      if (error) throw error;

      toast.success("Mês fechado com sucesso!");
      fetchClientData();
    } catch (error: any) {
      console.error('Error closing month:', error);
      toast.error("Erro ao fechar mês: " + error.message);
    } finally {
      setIsClosing(false);
    }
  };

  const formatMonth = () => {
    return MONTH_NAMES[parseInt(selectedMonth) - 1];
  };

  const processedDocs = documents.filter(d => d.status_processamento === 'concluido');
  const pendingDocs = documents.filter(d => d.status_processamento === 'nao_processado' || d.status_processamento === 'processando');
  const canClose = lancamentos.length > 0 && pendingDocs.length === 0 && !fechamento;

  return (
    <div className="bg-card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-5 bg-muted/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
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
            <SelectTrigger className="w-32 h-9 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-20 h-9 bg-background">
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

      {/* Fechamento Status ou Botão para Fechar */}
      <div className="mx-5 mt-4">
        {fechamento ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-green-500/10"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-green-500" />
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-600 text-xs font-medium hover:bg-green-500/30 transition-colors"
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    CSV
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="p-4 rounded-xl bg-muted/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {lancamentos.length > 0 && (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      {lancamentos.length} lançamento(s) alinhado(s)
                    </span>
                  )}
                  {pendingDocs.length > 0 && (
                    <span className="text-amber-500">{pendingDocs.length} doc(s) pendente(s)</span>
                  )}
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={!canClose || isClosing}
                    variant={canClose ? "default" : "outline"}
                    size="sm"
                  >
                    {isClosing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Fechando...
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 mr-1.5" />
                        Fechar {formatMonth()}
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Fechar mês de {formatMonth()}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Os relatórios serão gerados para o cliente {clientInfo?.name}. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCloseMonth}>Confirmar Fechamento</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </div>

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
