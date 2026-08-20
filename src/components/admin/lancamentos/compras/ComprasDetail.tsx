import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Upload, FileText, Loader2, Trash2, RefreshCw, CheckCircle2,
  AlertCircle, Calendar, Play, CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { fetchPlanoContas, type PlanoContasItem } from "@/lib/planoContas";

const MONTHS = [
  { value: "01", label: "Janeiro" }, { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" }, { value: "04", label: "Abril" },
  { value: "05", label: "Maio" }, { value: "06", label: "Junho" },
  { value: "07", label: "Julho" }, { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" }, { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
];

const formatBRL = (v: number | null) =>
  (v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  clientId: string;
  clientName: string;
  competencia?: string;
}

interface Linha {
  cfop: string;
  descricao: string;
  vr_contabil: number;
  selecionado: boolean;
}

interface ComprasUpload {
  id: string;
  nome_arquivo: string;
  storage_path: string;
  status: string;
  ultimo_erro: string | null;
  dados_extraidos: { linhas?: Linha[] } | null;
  created_at: string;
}

interface ComprasLancamento {
  id: string;
  data: string | null;
  cfop: string | null;
  conta_debito: string | null;
  conta_credito: string | null;
  historico: string | null;
  valor: number | null;
}

interface CfopMapping {
  debito: string;
  credito: string;
}

export const ComprasDetail = ({ clientId, clientName, competencia: controlledCompetencia }: Props) => {
  const navigate = useNavigate();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const competencia = controlledCompetencia || `${selectedYear}-${selectedMonth}`;
  const displayMonth = competencia.slice(5, 7);
  const displayYear = competencia.slice(0, 4);
  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - 2 + i));

  const [uploads, setUploads] = useState<ComprasUpload[]>([]);
  const [lancamentos, setLancamentos] = useState<ComprasLancamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [editedLinhas, setEditedLinhas] = useState<Record<string, Linha[]>>({});
  const [selectionUploadId, setSelectionUploadId] = useState<string | null>(null);
  const [planoContas, setPlanoContas] = useState<PlanoContasItem[]>([]);
  const [cfopMappings, setCfopMappings] = useState<Record<string, CfopMapping>>({});

  const loadMappings = useCallback(async () => {
    const [plan, { data: mappings }] = await Promise.all([
      fetchPlanoContas(clientId),
      supabase
        .from("compras_cfop_mapping")
        .select("cfop, conta_debito, conta_credito")
        .eq("client_id", clientId),
    ]);
    setPlanoContas(
      plan.items
        .filter((item) => item.analitica)
        .sort((a, b) => a.cr.localeCompare(b.cr, undefined, { numeric: true }))
    );
    setCfopMappings(
      Object.fromEntries(
        (mappings || []).map((mapping) => [
          mapping.cfop,
          { debito: mapping.conta_debito, credito: mapping.conta_credito },
        ])
      )
    );
  }, [clientId]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ data: ups }, { data: lans }] = await Promise.all([
        supabase.from("compras_uploads").select("*")
          .eq("client_id", clientId).eq("competencia", competencia)
          .order("created_at", { ascending: false }),
        supabase.from("compras_lancamentos").select("*")
          .eq("client_id", clientId).eq("competencia", competencia)
          .order("ordem", { ascending: true }),
      ]);
      setUploads((ups || []) as ComprasUpload[]);
      setLancamentos((lans || []) as ComprasLancamento[]);
      // Inicializar edição com linhas do banco
      const ed: Record<string, Linha[]> = {};
      (ups || []).forEach((u: any) => {
        if (u.dados_extraidos?.linhas) ed[u.id] = u.dados_extraidos.linhas;
      });
      setEditedLinhas(ed);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, competencia]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { void loadMappings(); }, [loadMappings]);

  const processUpload = useCallback(async (uploadId: string): Promise<Linha[] | null> => {
    setProcessingId(uploadId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        "https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/process-compras-cfop",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ uploadId }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro");
      const linhas = (result.linhas || []) as Linha[];
      toast.success(`Linhas extraídas: ${linhas.length}`);
      setEditedLinhas((prev) => ({ ...prev, [uploadId]: linhas }));
      return linhas;
    } catch (e: any) {
      toast.error("Erro: " + e.message);
      return null;
    } finally {
      setProcessingId(null);
    }
  }, []);

  const onDrop = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    const newIds: string[] = [];
    try {
      const { data: { user } } = await supabase.auth.getUser();
      for (const file of files) {
        if (!file.name.toLowerCase().endsWith(".pdf")) {
          toast.error(`${file.name} não é PDF`);
          continue;
        }
        const path = `compras/${clientId}/${competencia}/${Date.now()}_${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("lancamentos").upload(path, file, {
          contentType: "application/pdf",
        });
        if (upErr) { toast.error(`Erro ao enviar ${file.name}: ${upErr.message}`); continue; }
        const { data: ins, error: insErr } = await supabase.from("compras_uploads").insert({
          client_id: clientId, competencia, storage_path: path,
          nome_arquivo: file.name, status: "pendente", uploaded_by: user?.id,
        }).select("id").single();
        if (insErr) { toast.error(`Erro ao registrar ${file.name}: ${insErr.message}`); continue; }
        if (ins?.id) newIds.push(ins.id);
      }
      await fetchData();
    } finally {
      setUploading(false);
    }
    // Auto-processa cada upload sequencialmente e abre o modal de seleção do último
    for (const id of newIds) {
      const linhas = await processUpload(id);
      if (linhas && linhas.length > 0) {
        setSelectionUploadId(id);
      }
    }
    if (newIds.length) fetchData();
  }, [clientId, competencia, fetchData, processUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "application/pdf": [".pdf"] }, multiple: true,
  });

  const handleProcess = async (uploadId: string) => {
    const linhas = await processUpload(uploadId);
    if (linhas && linhas.length > 0) setSelectionUploadId(uploadId);
    fetchData();
  };

  const handleConfirm = async (uploadId: string) => {
    const linhas = (editedLinhas[uploadId] || []).filter((l) => l.selecionado && l.vr_contabil > 0);
    if (!linhas.length) { toast.error("Selecione pelo menos uma linha"); return; }
    const semMap = linhas.filter((l) => {
      const mapping = cfopMappings[String(l.cfop)];
      return !mapping?.debito || !mapping?.credito;
    });
    if (semMap.length) {
      toast.error(`Defina débito e crédito para o(s) CFOP(s): ${[...new Set(semMap.map(l => l.cfop))].join(", ")}.`);
      return;
    }
    setConfirmingId(uploadId);
    try {
      const mappingsToSave = [...new Map(linhas.map((linha) => [String(linha.cfop), linha])).values()]
        .map((linha) => ({
          client_id: clientId,
          cfop: String(linha.cfop),
          descricao: linha.descricao,
          conta_debito: cfopMappings[String(linha.cfop)].debito,
          conta_credito: cfopMappings[String(linha.cfop)].credito,
          ativo_padrao: true,
        }));
      const { error: mappingError } = await supabase
        .from("compras_cfop_mapping")
        .upsert(mappingsToSave, { onConflict: "client_id,cfop" });
      if (mappingError) throw mappingError;

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        "https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/confirm-compras-lancamentos",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ uploadId, linhas }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || result.error || "Erro");
      toast.success(`${result.total} lançamento(s) gerados`);
      setSelectionUploadId(null);
      navigate(`/admin/lancamentos/compras/${clientId}/editar?competencia=${competencia}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDelete = async (id: string, path: string) => {
    if (!confirm("Remover este PDF e os lançamentos vinculados?")) return;
    try {
      await supabase.storage.from("lancamentos").remove([path]);
      await supabase.from("compras_lancamentos").delete().eq("source_upload_id", id);
      await supabase.from("compras_uploads").delete().eq("id", id);
      toast.success("Removido");
      fetchData();
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleLinha = (uploadId: string, idx: number, checked: boolean) => {
    setEditedLinhas((prev) => ({
      ...prev,
      [uploadId]: (prev[uploadId] || []).map((l, i) => i === idx ? { ...l, selecionado: checked } : l),
    }));
  };

  const toggleAll = (uploadId: string, checked: boolean) => {
    setEditedLinhas((prev) => ({
      ...prev,
      [uploadId]: (prev[uploadId] || []).map((l) => ({ ...l, selecionado: checked })),
    }));
  };

  const updateMapping = (cfop: string, field: keyof CfopMapping, value: string) => {
    setCfopMappings((previous) => ({
      ...previous,
      [cfop]: {
        debito: previous[cfop]?.debito || "",
        credito: previous[cfop]?.credito || "",
        [field]: value,
      },
    }));
  };

  const statusBadge = (s: string) => {
    if (s === "lancado") return <Badge className="bg-emerald-500/10 text-emerald-700 border-0"><CheckCircle2 className="w-3 h-3 mr-1" />Lançado</Badge>;
    if (s === "processado") return <Badge className="bg-blue-500/10 text-blue-700 border-0"><CheckCircle2 className="w-3 h-3 mr-1" />Processado</Badge>;
    if (s === "erro") return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Erro</Badge>;
    if (s === "processando") return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processando</Badge>;
    return <Badge variant="outline">Pendente</Badge>;
  };

  return (
    <>
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
              {uploading ? "Enviando..." : isDragActive ? "Solte os PDFs aqui" : "Arraste o Registro de Entradas (PDF) ou clique para selecionar"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Apenas PDF • {clientName} • {displayMonth}/{displayYear}</p>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 inline animate-spin mr-2" />Carregando...
            </div>
          ) : uploads.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">
              Nenhum arquivo enviado para esta competência.
            </div>
          ) : (
            <div className="space-y-4">
              {uploads.map((u) => {
                const linhas = editedLinhas[u.id] || [];
                const allChecked = linhas.length > 0 && linhas.every((l) => l.selecionado);
                return (
                  <div key={u.id} className="border border-border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{u.nome_arquivo}</p>
                        {u.ultimo_erro && <p className="text-xs text-destructive truncate">{u.ultimo_erro}</p>}
                      </div>
                      {statusBadge(u.status)}
                      {(u.status === "pendente" || u.status === "erro") && (
                        <Button size="sm" variant="outline" className="h-8" disabled={processingId === u.id}
                          onClick={() => handleProcess(u.id)}>
                          {processingId === u.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
                          Extrair com IA
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(u.id, u.storage_path)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {linhas.length > 0 && (
                      <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {linhas.length} linha(s) extraída(s) • {linhas.filter(l => l.selecionado).length} pré-selecionada(s)
                        </p>
                        <Button size="sm" variant="outline" onClick={() => setSelectionUploadId(u.id)}>
                          <CheckSquare className="w-3.5 h-3.5 mr-1.5" /> Selecionar linhas
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {lancamentos.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">
                Lançamentos gerados ({lancamentos.length})
              </h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[110px]">Data</TableHead>
                      <TableHead className="w-[70px]">CFOP</TableHead>
                      <TableHead className="w-[80px]">Débito</TableHead>
                      <TableHead className="w-[80px]">Crédito</TableHead>
                      <TableHead>Histórico</TableHead>
                      <TableHead className="text-right w-[130px]">Valor (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lancamentos.map((l) => {
                      const data = l.data ? (() => {
                        const [y, m, d] = l.data.split("-");
                        return `${d}/${m}/${y}`;
                      })() : "";
                      return (
                        <TableRow key={l.id}>
                          <TableCell className="whitespace-nowrap">{data}</TableCell>
                          <TableCell className="font-mono text-xs">{l.cfop || "-"}</TableCell>
                          <TableCell>{l.conta_debito ?? "-"}</TableCell>
                          <TableCell>{l.conta_credito ?? "-"}</TableCell>
                          <TableCell className="text-sm">{l.historico}</TableCell>
                          <TableCell className="text-right font-mono">{formatBRL(l.valor)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </motion.div>


      <Dialog open={!!selectionUploadId} onOpenChange={(o) => !o && setSelectionUploadId(null)}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecione as linhas a lançar</DialogTitle>
            <DialogDescription>
              Selecione as operações e confirme as contas desta empresa. O mapeamento será reutilizado nas próximas competências.
            </DialogDescription>
          </DialogHeader>
          {selectionUploadId && (() => {
            const linhas = editedLinhas[selectionUploadId] || [];
            const allChecked = linhas.length > 0 && linhas.every((l) => l.selecionado);
            const selCount = linhas.filter((l) => l.selecionado).length;
            const totalSel = linhas.filter((l) => l.selecionado).reduce((s, l) => s + (l.vr_contabil || 0), 0);
            return (
              <>
                <div className="overflow-auto border border-border rounded-lg">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead className="w-[44px]">
                          <Checkbox checked={allChecked} onCheckedChange={(v) => toggleAll(selectionUploadId, !!v)} />
                        </TableHead>
                        <TableHead className="w-[80px]">CFOP</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="min-w-[210px]">Débito</TableHead>
                        <TableHead className="min-w-[210px]">Crédito</TableHead>
                        <TableHead className="text-right w-[150px]">Vr. Contábil (R$)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linhas.map((l, i) => {
                        return (
                          <TableRow key={i}>
                            <TableCell>
                              <Checkbox checked={l.selecionado} onCheckedChange={(v) => toggleLinha(selectionUploadId, i, !!v)} />
                            </TableCell>
                            <TableCell className="font-mono text-xs">{l.cfop}</TableCell>
                            <TableCell className="text-sm">{l.descricao}</TableCell>
                            <TableCell>
                              <Select
                                value={cfopMappings[String(l.cfop)]?.debito || undefined}
                                onValueChange={(value) => updateMapping(String(l.cfop), "debito", value)}
                                disabled={!l.selecionado}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Selecionar conta" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                  {planoContas.map((conta) => (
                                    <SelectItem key={`d-${conta.cr}`} value={conta.cr}>
                                      {conta.cr} — {conta.descricao}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={cfopMappings[String(l.cfop)]?.credito || undefined}
                                onValueChange={(value) => updateMapping(String(l.cfop), "credito", value)}
                                disabled={!l.selecionado}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Selecionar conta" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                  {planoContas.map((conta) => (
                                    <SelectItem key={`c-${conta.cr}`} value={conta.cr}>
                                      {conta.cr} — {conta.descricao}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatBRL(l.vr_contabil)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {selCount} de {linhas.length} selecionada(s) • Total: R$ {formatBRL(totalSel)}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectionUploadId(null)}>Cancelar</Button>
                    <Button size="sm" disabled={confirmingId === selectionUploadId} onClick={() => handleConfirm(selectionUploadId)}>
                      {confirmingId === selectionUploadId ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5 mr-1.5" />}
                      Confirmar e lançar
                    </Button>
                  </div>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
};
