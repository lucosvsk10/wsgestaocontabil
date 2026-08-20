import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Upload, FileText, Loader2, FileSpreadsheet, Trash2, RefreshCw,
  CheckCircle2, AlertCircle, Calendar, ChevronDown, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { TranscricaoEditor } from "./TranscricaoEditor";
import { LancamentosInlineEditor } from "./LancamentosInlineEditor";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface FolhaPagamentoDetailProps {
  clientId: string;
  clientName: string;
  competencia?: string;
}

interface FolhaUpload {
  id: string;
  nome_arquivo: string;
  storage_path: string;
  status: string;
  ultimo_erro: string | null;
  created_at: string;
}

interface Transcricao {
  id: string;
  upload_id: string;
  linhas: any[];
  total_rendimentos_pdf: number | null;
  total_descontos_pdf: number | null;
  total_recol_fgts_pdf: number | null;
  status: string;
  erro: string | null;
}

const MONTHS = [
  { value: "01", label: "Janeiro" }, { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" }, { value: "04", label: "Abril" },
  { value: "05", label: "Maio" }, { value: "06", label: "Junho" },
  { value: "07", label: "Julho" }, { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" }, { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
];

const FUNCTIONS_BASE = "https://nadtoitgkukzbghtbohm.supabase.co/functions/v1";

export const FolhaPagamentoDetail = ({ clientId, clientName, competencia: controlledCompetencia }: FolhaPagamentoDetailProps) => {
  const navigate = useNavigate();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const competencia = controlledCompetencia || `${selectedYear}-${selectedMonth}`;
  const displayMonth = competencia.slice(5, 7);
  const displayYear = competencia.slice(0, 4);
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

  const [uploads, setUploads] = useState<FolhaUpload[]>([]);
  const [transcricoes, setTranscricoes] = useState<Transcricao[]>([]);
  const [lancamentosCount, setLancamentosCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ data: ups }, { data: trans }, { count }] = await Promise.all([
        supabase.from("folha_uploads").select("*").eq("client_id", clientId).eq("competencia", competencia).order("created_at", { ascending: false }),
        supabase.from("folha_transcricoes").select("*").eq("client_id", clientId).eq("competencia", competencia),
        supabase.from("folha_lancamentos").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("competencia", competencia),
      ]);
      setUploads((ups || []) as FolhaUpload[]);
      setTranscricoes((trans || []) as Transcricao[]);
      setLancamentosCount(count || 0);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, competencia]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime: atualiza quando uploads/transcrições mudam
  useEffect(() => {
    const ch = supabase
      .channel(`folha-${clientId}-${competencia}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "folha_uploads", filter: `client_id=eq.${clientId}` }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "folha_transcricoes", filter: `client_id=eq.${clientId}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clientId, competencia, fetchData]);

  const triggerTranscricao = async (uploadId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${FUNCTIONS_BASE}/transcrever-folha`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ uploadId }),
      });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        throw new Error(result.error || "Erro ao transcrever");
      }
    } catch (e: any) {
      toast.error(`Falha ao processar: ${e.message}`);
    }
  };

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
        const { error: upErr } = await supabase.storage.from("lancamentos").upload(path, file, { contentType: "application/pdf" });
        if (upErr) { toast.error(`Erro ao enviar ${file.name}: ${upErr.message}`); continue; }
        const { data: inserted, error: insErr } = await supabase.from("folha_uploads").insert({
          client_id: clientId,
          competencia,
          storage_path: path,
          nome_arquivo: file.name,
          status: "transcrevendo",
          uploaded_by: user?.id,
        }).select().single();
        if (insErr || !inserted) { toast.error(`Erro ao registrar ${file.name}: ${insErr?.message}`); continue; }
        // Dispara transcrição imediatamente (não aguarda resposta)
        triggerTranscricao(inserted.id);
      }
      toast.success("Upload concluído. Processando...");
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

  const handleDelete = async (id: string, path: string) => {
    if (!confirm("Remover este PDF e todos os dados vinculados?")) return;
    try {
      await supabase.storage.from("lancamentos").remove([path]);
      await supabase.from("folha_lancamentos").delete().eq("source_upload_id", id);
      await supabase.from("folha_transcricoes").delete().eq("upload_id", id);
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
    switch (s) {
      case "processado":
      case "contabilizado":
        return <Badge className="bg-green-500/10 text-green-700 border-0"><CheckCircle2 className="w-3 h-3 mr-1" />Concluído</Badge>;
      case "transcrito":
        return <Badge className="bg-blue-500/10 text-blue-700 border-0"><CheckCircle2 className="w-3 h-3 mr-1" />Transcrito</Badge>;
      case "transcrevendo":
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Transcrevendo</Badge>;
      case "contabilizando":
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Gerando lançamentos</Badge>;
      case "erro_transcricao":
      case "erro":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Erro</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  const transByUpload = useMemo(() => {
    const map: Record<string, Transcricao> = {};
    for (const t of transcricoes) map[t.upload_id] = t;
    return map;
  }, [transcricoes]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-5 border-b border-border flex flex-wrap items-center gap-3">
        {!controlledCompetencia && <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={fetchData} className="h-9">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Atualizar
          </Button>
          {lancamentosCount > 0 && (
            <Button size="sm" onClick={handleOpenEditor} className="h-9">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Exportar ({lancamentosCount})
            </Button>
          )}
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
            {uploading ? "Enviando..." : isDragActive ? "Solte os PDFs aqui" : "Arraste PDFs da folha ou clique para selecionar"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Processamento inicia automaticamente • {clientName} • {displayMonth}/{displayYear}</p>
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
            <ul className="space-y-2">
              {uploads.map((u) => {
                const t = transByUpload[u.id];
                const isOpen = expanded[u.id] ?? true;
                return (
                  <li key={u.id} className="border border-border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button className="text-muted-foreground" onClick={() => setExpanded((p) => ({ ...p, [u.id]: !isOpen }))}>
                        {t ? (isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />) : <FileText className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{u.nome_arquivo}</p>
                        {u.ultimo_erro && <p className="text-xs text-destructive whitespace-pre-wrap break-words">{u.ultimo_erro}</p>}
                      </div>
                      {statusBadge(u.status)}
                      {u.status === "erro" || u.status === "erro_transcricao" ? (
                        <Button size="sm" variant="outline" className="h-8" onClick={() => {
                          if (window.confirm("Reprocessar este arquivo? Os dados de transcrição e lançamentos atuais serão sobrescritos.")) {
                            triggerTranscricao(u.id);
                          }
                        }}>
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reprocessar
                        </Button>
                      ) : null}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(u.id, u.storage_path)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    {t && isOpen && (
                      <div className="p-3 border-t border-border bg-muted/20">
                        <Tabs defaultValue="lancamentos" className="w-full">
                          <TabsList className="mb-3">
                            <TabsTrigger value="lancamentos">Lançamentos contábeis</TabsTrigger>
                            <TabsTrigger value="transcricao">Transcrição do PDF</TabsTrigger>
                          </TabsList>
                          <TabsContent value="lancamentos" className="mt-0">
                            <LancamentosInlineEditor
                              uploadId={u.id}
                              clientId={clientId}
                              competencia={competencia}
                              transcricaoId={t.id}
                              transcricaoStatus={t.status}
                            />
                          </TabsContent>
                          <TabsContent value="transcricao" className="mt-0">
                            <TranscricaoEditor transcricao={t} onChanged={fetchData} />
                          </TabsContent>
                        </Tabs>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );
};
