import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Calendar, Download, FileSpreadsheet, User, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Document {
  id: string;
  nome_arquivo: string;
  tipo_documento: string;
  status_processamento: string;
  created_at: string;
  url_storage: string;
  ultimo_erro?: string;
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

const TYPE_LABELS: Record<string, string> = {
  compra: "Compra",
  extrato: "Extrato",
  comprovante: "Comprovante",
  observacao: "Observação"
};

const STATUS_CONFIG = {
  pendente: { icon: Clock, label: "Pendente", color: "bg-yellow-500/10 text-yellow-600" },
  processando: { icon: Clock, label: "Processando", color: "bg-blue-500/10 text-blue-600" },
  processado: { icon: CheckCircle, label: "Processado", color: "bg-green-500/10 text-green-600" },
  erro: { icon: AlertCircle, label: "Erro", color: "bg-destructive/10 text-destructive" }
};

export const ClientLancamentosDetail = ({ clientId }: ClientLancamentosDetailProps) => {
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [isLoading, setIsLoading] = useState(true);

  const competencia = `${selectedYear}-${selectedMonth}`;
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

  useEffect(() => {
    fetchClientData();
  }, [clientId, competencia]);

  const fetchClientData = async () => {
    setIsLoading(true);
    try {
      // Fetch client info
      const { data: user } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', clientId)
        .single();
      
      setClientInfo(user);

      // Fetch documents
      const { data: docs } = await supabase
        .from('documentos_conciliacao')
        .select('*')
        .eq('user_id', clientId)
        .eq('competencia', competencia)
        .order('created_at', { ascending: false });
      
      setDocuments(docs || []);

      // Fetch fechamentos
      const { data: fechs } = await supabase
        .from('fechamentos_exportados')
        .select('*')
        .eq('user_id', clientId)
        .order('competencia', { ascending: false })
        .limit(6);
      
      setFechamentos(fechs || []);

    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentFechamento = fechamentos.find(f => f.competencia === competencia);

  return (
    <div className="space-y-6">
      {/* Client Header */}
      {clientInfo && (
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {clientInfo.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {clientInfo.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Month Selector */}
      <div className="flex items-center gap-3">
        <Calendar className="h-5 w-5 text-primary" />
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

      {/* Fechamento Status */}
      {currentFechamento && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/10 border border-green-500/30 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium text-foreground">Mês Fechado</p>
                <p className="text-sm text-muted-foreground">
                  {currentFechamento.total_lancamentos} lançamentos
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {currentFechamento.arquivo_excel_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(currentFechamento.arquivo_excel_url, '_blank')}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
              )}
              {currentFechamento.arquivo_csv_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(currentFechamento.arquivo_csv_url, '_blank')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Documents List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">
            Documentos ({documents.length})
          </h3>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhum documento enviado neste período
          </div>
        ) : (
          <div className="divide-y divide-border">
            {documents.map((doc) => {
              const status = STATUS_CONFIG[doc.status_processamento as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pendente;
              const StatusIcon = status.icon;

              return (
                <div key={doc.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground truncate max-w-xs">
                          {doc.nome_arquivo}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{TYPE_LABELS[doc.tipo_documento] || doc.tipo_documento}</span>
                          <span>•</span>
                          <span>{format(new Date(doc.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                        </div>
                        {doc.ultimo_erro && (
                          <p className="text-xs text-destructive mt-1">{doc.ultimo_erro}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={status.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(doc.url_storage, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Fechamentos */}
      {fechamentos.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">
              Histórico de Fechamentos
            </h3>
          </div>
          <div className="divide-y divide-border">
            {fechamentos.map((fech) => (
              <div key={fech.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {MONTHS.find(m => m.value === fech.competencia.split('-')[1])?.label} {fech.competencia.split('-')[0]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fech.total_lancamentos} lançamentos
                  </p>
                </div>
                <div className="flex gap-2">
                  {fech.arquivo_excel_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(fech.arquivo_excel_url, '_blank')}
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                    </Button>
                  )}
                  {fech.arquivo_csv_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(fech.arquivo_csv_url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
