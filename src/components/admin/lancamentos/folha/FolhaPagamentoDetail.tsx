import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Upload, FileText, Loader2, FileSpreadsheet, Trash2, RefreshCw,
  CheckCircle2, AlertCircle, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface FolhaLancamento {
  id: string;
  data: string;
  conta_debito: number | null;
  conta_credito: number | null;
  historico: string | null;
  valor: number | null;
  ordem: number | null;
}

const formatDateBR = (d: string) => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
};
const formatBRL = (v: number | null) =>
  (v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface FolhaPagamentoDetailProps {
  clientId: string;
  clientName: string;
}

interface FolhaUpload {
  id: string;
  nome_arquivo: string;
  storage_path: string;
  status: string;
  ultimo_erro: string | null;
  created_at: string;
}

const MONTHS = [
  { value: "01", label: "Janeiro" }, { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" }, { value: "04", label: "Abril" },
  { value: "05", label: "Maio" }, { value: "06", label: "Junho" },
  { value: "07", label: "Julho" }, { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" }, { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
];

export const FolhaPagamentoDetail = ({ clientId, clientName }: FolhaPagamentoDetailProps) => {
  const navigate = useNavigate();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const competencia = `${selectedYear}-${selectedMonth}`;
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

  const [uploads, setUploads] = useState<FolhaUpload[]>([]);
  const [lancamentos, setLancamentos] = useState<FolhaLancamento[]>([]);
  const lancamentosCount = lancamentos.length;
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ data: ups }, { data: lans }] = await Promise.all([
        supabase.from("folha_uploads").select("*").eq("client_id", clientId).eq("competencia", competencia).order("created_at", { ascending: false }),
        supabase.from("folha_lancamentos").select("*").eq("client_id", clientId).eq("competencia", competencia).order("ordem", { ascending: true }),
      ]);
      setUploads((ups || []) as FolhaUpload[]);
      setLancamentos((lans || []) as FolhaLancamento[]);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, competencia]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onDrop = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      for (const file of files) {
        if (!file.name.toLowerCase().endsWith(".pdf")) {
          toast.error(`${file.name} não é PDF`);
          continue;
        }
        const path = `folha/${clientId}/${competencia}/${Date.now()}_${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("lancamentos").upload(path, file, {
          contentType: "application/pdf",
        });
        if (upErr) {
          toast.error(`Erro ao enviar ${file.name}: ${upErr.message}`);
          continue;
        }
        const { error: insErr } = await supabase.from("folha_uploads").insert({
          client_id: clientId,
          competencia,
          storage_path: path,
          nome_arquivo: file.name,
          status: "pendente",
          uploaded_by: user?.id,
        });
        if (insErr) {
          toast.error(`Erro ao registrar ${file.name}: ${insErr.message}`);
        }
      }
      toast.success("Upload concluído");
      fetchData();
    } finally {
      setUploading(false);
    }
  }, [clientId, competencia, fetchData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
  });

  const handleProcess = async () => {
    const pending = uploads.filter((u) => u.status !== "processado");
    if (pending.length === 0) {
      toast.info("Nenhum PDF pendente para processar");
      return;
    }
    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        "https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/process-folha-pagamento",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            clientId,
            competencia,
            uploadIds: pending.map((u) => u.id),
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao processar");
      toast.success(`Processado! ${result.total_lancamentos || 0} lançamentos gerados.`);
      fetchData();
    } catch (e: any) {
      toast.error("Erro ao processar: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string, path: string) => {
    if (!confirm("Remover este PDF e os lançamentos vinculados?")) return;
    try {
      await supabase.storage.from("lancamentos").remove([path]);
      await supabase.from("folha_lancamentos").delete().eq("source_upload_id", id);
      await supabase.from("folha_uploads").delete().eq("id", id);
      toast.success("Removido");
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleOpenEditor = () => {
    navigate(`/admin/lancamentos/folha/${clientId}/editar?competencia=${competencia}`);
  };

  const statusBadge = (s: string) => {
    if (s === "processado") return <Badge className="bg-green-500/10 text-green-700 border-0"><CheckCircle2 className="w-3 h-3 mr-1" />Processado</Badge>;
    if (s === "erro") return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Erro</Badge>;
    if (s === "processando") return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processando</Badge>;
    return <Badge variant="outline">Pendente</Badge>;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-5 border-b border-border flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={fetchData} className="h-9">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Atualizar
          </Button>
          <Button size="sm" onClick={handleProcess} disabled={isProcessing || uploads.length === 0} className="h-9">
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
            Processar com IA
          </Button>
          <Button size="sm" variant="default" onClick={handleOpenEditor} disabled={lancamentosCount === 0} className="h-9">
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Abrir editor ({lancamentosCount})
          </Button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
            isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
            uploading && "opacity-60 pointer-events-none"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            {uploading ? "Enviando..." : isDragActive ? "Solte os PDFs aqui" : "Arraste PDFs da folha de pagamento ou clique para selecionar"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Apenas arquivos PDF • {clientName} • {selectedMonth}/{selectedYear}</p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">Arquivos do mês</h3>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm"><Loader2 className="w-4 h-4 inline animate-spin mr-2" />Carregando...</div>
          ) : uploads.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">
              Nenhum arquivo enviado para esta competência.
            </div>
          ) : (
            <ul className="divide-y divide-border/40 border border-border rounded-lg">
              {uploads.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{u.nome_arquivo}</p>
                    {u.ultimo_erro && <p className="text-xs text-destructive truncate">{u.ultimo_erro}</p>}
                  </div>
                  {statusBadge(u.status)}
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(u.id, u.storage_path)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );
};
