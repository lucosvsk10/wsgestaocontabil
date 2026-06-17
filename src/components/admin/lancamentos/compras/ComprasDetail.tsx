import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Upload, FileText, Loader2, Trash2, RefreshCw, CheckCircle2,
  AlertCircle, Calendar, Settings2, Play, CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { CfopMappingDialog } from "./CfopMappingDialog";

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

export const ComprasDetail = ({ clientId, clientName }: Props) => {
  const navigate = useNavigate();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const competencia = `${selectedYear}-${selectedMonth}`;
  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - 2 + i));

  const [uploads, setUploads] = useState<ComprasUpload[]>([]);
  const [lancamentos, setLancamentos] = useState<ComprasLancamento[]>([]);
  const [mappedCfops, setMappedCfops] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [editedLinhas, setEditedLinhas] = useState<Record<string, Linha[]>>({});
  const [mappingOpen, setMappingOpen] = useState(false);
  const [selectionUploadId, setSelectionUploadId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ data: ups }, { data: lans }, { data: mps }] = await Promise.all([
        supabase.from("compras_uploads").select("*")
          .eq("client_id", clientId).eq("competencia", competencia)
          .order("created_at", { ascending: false }),
        supabase.from("compras_lancamentos").select("*")
          .eq("client_id", clientId).eq("competencia", competencia)
          .order("ordem", { ascending: true }),
        supabase.from("compras_cfop_mapping").select("cfop").eq("client_id", clientId),
      ]);
      setUploads((ups || []) as ComprasUpload[]);
      setLancamentos((lans || []) as ComprasLancamento[]);
      setMappedCfops(new Set((mps || []).map((m: any) => String(m.cfop))));
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
    const semMap = linhas.filter((l) => !mappedCfops.has(l.cfop));
    if (semMap.length) {
      toast.error(`CFOP(s) sem mapeamento: ${[...new Set(semMap.map(l => l.cfop))].join(", ")}. Abra "Mapear CFOPs".`);
      return;
    }
    setConfirmingId(uploadId);
    try {
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
            <Button size="sm" variant="outline" onClick={() => setMappingOpen(true)} className="h-9">
              <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Mapear CFOPs
            </Button>
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
            <p className="text-xs text-muted-foreground mt-1">Apenas PDF • {clientName} • {selectedMonth}/{selectedYear}</p>
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

      <CfopMappingDialog
        open={mappingOpen}
        onOpenChange={setMappingOpen}
        clientId={clientId}
        onSaved={fetchData}
      />

      <Dialog open={!!selectionUploadId} onOpenChange={(o) => !o && setSelectionUploadId(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecione as linhas a lançar</DialogTitle>
            <DialogDescription>
              Itens pré-marcados seguem o mapeamento padrão de CFOPs. Ajuste se necessário e confirme para gerar os lançamentos.
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
                        <TableHead className="text-right w-[150px]">Vr. Contábil (R$)</TableHead>
                        <TableHead className="w-[120px] text-xs">Mapeamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linhas.map((l, i) => {
                        const mapped = mappedCfops.has(l.cfop);
                        return (
                          <TableRow key={i} className={cn(!mapped && l.selecionado && "bg-destructive/5")}>
                            <TableCell>
                              <Checkbox checked={l.selecionado} onCheckedChange={(v) => toggleLinha(selectionUploadId, i, !!v)} />
                            </TableCell>
                            <TableCell className="font-mono text-xs">{l.cfop}</TableCell>
                            <TableCell className="text-sm">{l.descricao}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatBRL(l.vr_contabil)}</TableCell>
                            <TableCell className="text-xs">
                              {mapped ? (
                                <span className="text-emerald-600">OK</span>
                              ) : (
                                <span className="text-destructive">não mapeado</span>
                              )}
                            </TableCell>
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
