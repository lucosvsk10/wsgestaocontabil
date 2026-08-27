import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, CalendarDays, ChevronDown, Download, FileText, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { FiscalDocumentPreview } from "@/components/admin/fiscal/FiscalDocumentPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Company = {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  uf?: string;
  ambiente_padrao?: "producao" | "homologacao";
  last_sync_at?: string;
  fiscal_certificates?: { valid_until?: string; is_active?: boolean }[];
};

type Doc = {
  nsu?: string;
  schema?: string;
  documentKind?: "nfe" | "resumo" | "evento" | "documento";
  fullXml?: boolean;
  direction?: "entrada" | "saida" | "relacionada";
  accessKey?: string;
  issueDate?: string;
  value?: number;
  issuerCnpj?: string;
  issuerName?: string;
  recipientCnpj?: string;
  number?: string;
  series?: string;
  statusCode?: string;
  xml?: string;
  parseError?: string;
};

type Filter = "saida" | "entrada" | "todos" | "cancelada" | "evento";
type PeriodMode = "month" | "custom";

const MONTHS = ["Ano", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"] as const;
const MONTH_INDEX: Record<string, number> = { Jan: 0, Fev: 1, Mar: 2, Abr: 3, Mai: 4, Jun: 5, Jul: 6, Ago: 7, Set: 8, Out: 9, Nov: 10, Dez: 11 };
const PAGE_SIZE = 50;

const money = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatCnpj = (v: string) => {
  const d = String(v || "").replace(/\D/g, "");
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : v;
};
const date = (v?: string) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("pt-BR");
};
const time = (v?: string) => {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};
const isoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const xmlTag = (xml: string | undefined, name: string) => xml?.match(new RegExp(`<(?:\\w+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${name}>`, "i"))?.[1]?.trim() || "";
const eventDescription = (doc: Doc) => {
  if (doc.documentKind !== "evento") return "";
  return xmlTag(doc.xml, "descEvento") || xmlTag(doc.xml, "xEvento") || "Evento fiscal";
};
function rowToDoc(r: any): Doc {
  return {
    nsu: r.nsu,
    schema: r.schema_name,
    documentKind: r.document_kind,
    fullXml: r.full_xml,
    direction: r.direction,
    accessKey: r.access_key,
    issueDate: r.issue_date,
    value: Number(r.value || 0),
    issuerCnpj: r.issuer_cnpj,
    issuerName: r.issuer_name,
    recipientCnpj: r.recipient_cnpj,
    number: r.note_number,
    series: r.series,
    statusCode: r.status_code,
    xml: r.xml,
    parseError: r.parse_error,
  };
}
async function vaultList() {
  const { data, error } = await supabase.functions.invoke("fiscal-company-vault", { body: { action: "list" } });
  if (error) throw error;
  return (data?.companies || []) as Company[];
}

export default function AdminFiscalNotes() {
  const navigate = useNavigate();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const today = isoDate(now);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<(typeof MONTHS)[number]>(MONTHS[currentMonth + 1]);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState(isoDate(new Date(currentYear, currentMonth, 1)));
  const [customEnd, setCustomEnd] = useState(today);
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [syncNotice, setSyncNotice] = useState("");
  const [selected, setSelected] = useState<Doc | null>(null);
  const [page, setPage] = useState(1);

  const loadCompanies = async () => {
    const list = await vaultList();
    setCompanies(list);
    const saved = localStorage.getItem("ws_fiscal_company_id");
    const chosen = list.find(x => x.id === saved) || list[0] || null;
    setCompany(chosen);
    if (chosen) localStorage.setItem("ws_fiscal_company_id", chosen.id);
  };

  const loadDocs = async (c: Company | null) => {
    if (!c) {
      setDocs([]);
      return [] as Doc[];
    }
    const db = supabase as any;
    const { data, error } = await db
      .from("fiscal_dfe_documents")
      .select("*")
      .eq("cnpj", String(c.cnpj).replace(/\D/g, ""))
      .eq("environment", c.ambiente_padrao || "producao")
      .order("issue_date", { ascending: false })
      .limit(5000);
    if (error) throw error;
    const mapped = (data || []).map(rowToDoc);
    setDocs(mapped);
    return mapped as Doc[];
  };

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await loadCompanies();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (company) void loadDocs(company).catch(e => setError(e instanceof Error ? e.message : String(e)));
    setPage(1);
    setQuery("");
    setFilter("todos");
    setSyncNotice("");
  }, [company?.id]);

  useEffect(() => setPage(1), [year, month, periodMode, customStart, customEnd, filter, query]);

  const periodDocs = useMemo(() => docs.filter(d => {
    if (!d.issueDate) return periodMode === "month" && month === "Ano";
    const dt = new Date(d.issueDate);
    if (Number.isNaN(dt.getTime())) return false;

    if (periodMode === "custom") {
      const stamp = isoDate(dt);
      return stamp >= customStart && stamp <= customEnd;
    }

    if (dt.getFullYear() !== year) return false;
    if (month !== "Ano" && dt.getMonth() !== MONTH_INDEX[month]) return false;
    return true;
  }), [docs, year, month, periodMode, customStart, customEnd]);

  const emitted = periodDocs.filter(d => d.direction === "saida" && d.documentKind !== "evento");
  const received = periodDocs.filter(d => d.direction === "entrada" && d.documentKind !== "evento");
  const events = periodDocs.filter(d => d.documentKind === "evento");
  const cancelled = periodDocs.filter(d => d.documentKind !== "evento" && ["101", "155"].includes(String(d.statusCode || "")));
  const fiscalDocs = periodDocs.filter(d => d.documentKind !== "evento");
  const withXml = fiscalDocs.filter(d => d.fullXml && d.xml);

  const filtered = useMemo(() => periodDocs.filter(d => {
    if (filter === "saida" && (d.direction !== "saida" || d.documentKind === "evento")) return false;
    if (filter === "entrada" && (d.direction !== "entrada" || d.documentKind === "evento")) return false;
    if (filter === "evento" && d.documentKind !== "evento") return false;
    if (filter === "cancelada" && (d.documentKind === "evento" || !["101", "155"].includes(String(d.statusCode || "")))) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [d.number, d.accessKey, d.issuerName, d.issuerCnpj, d.recipientCnpj, d.nsu, d.series, eventDescription(d)]
      .some(v => String(v || "").toLowerCase().includes(q));
  }), [periodDocs, filter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageDocs = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const cert = company?.fiscal_certificates?.find(x => x.is_active) || company?.fiscal_certificates?.[0];
  const certValid = !!cert?.valid_until && new Date(`${cert.valid_until}T23:59:59`) > now;

  const sync = async () => {
    if (!company || !certValid) return;
    setSyncing(true);
    setError("");
    setSyncNotice("");
    try {
      const { data, error } = await supabase.functions.invoke("dfe-extractor-native", {
        body: { company_id: company.id, environment: company.ambiente_padrao || "producao" },
      });
      if (error) {
        let message = error.message;
        try {
          const ctx = (error as any).context;
          if (ctx) message = (await ctx.clone().json())?.error || message;
        } catch { /* noop */ }
        throw new Error(message);
      }
      const loaded = await loadDocs(company);
      const list = await vaultList();
      setCompanies(list);
      setCompany(list.find(x => x.id === company.id) || company);

      const cStat = String(data?.response?.cStat || "");
      const newCount = Number(data?.newDocuments || 0);
      if (cStat === "656") {
        setError("Consumo temporariamente bloqueado pelo Ambiente Nacional. Aguarde antes de sincronizar novamente.");
      } else if (newCount > 0) {
        const returned = Array.isArray(data?.documents) ? data.documents as Doc[] : loaded;
        const recentEvents = returned.filter(d => d.documentKind === "evento").length;
        setFilter("todos");
        setPage(1);
        setSyncNotice(recentEvents === newCount
          ? `Sincronização concluída · ${newCount} novo(s) evento(s) fiscal(is) recebido(s).`
          : `Sincronização concluída · ${newCount} novo(s) documento(s) recebido(s).`);
      } else if (cStat === "137") {
        setSyncNotice("Sincronização concluída · nenhum documento novo disponível neste momento.");
      } else {
        setSyncNotice("Sincronização concluída com sucesso.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  const choose = (id: string) => {
    const c = companies.find(x => x.id === id) || null;
    setCompany(c);
    if (c) localStorage.setItem("ws_fiscal_company_id", c.id);
  };

  const chooseMonth = (m: (typeof MONTHS)[number]) => {
    if (m !== "Ano" && year === currentYear && MONTH_INDEX[m] > currentMonth) return;
    setPeriodMode("month");
    setCustomOpen(false);
    setMonth(m);
  };

  const changeYear = (delta: number) => {
    const next = Math.min(currentYear, year + delta);
    setYear(next);
    setPeriodMode("month");
    setCustomOpen(false);
    if (next === currentYear && month !== "Ano" && MONTH_INDEX[month] > currentMonth) setMonth(MONTHS[currentMonth + 1]);
  };

  const applyCustom = () => {
    if (!customStart || !customEnd || customStart > customEnd) {
      setError("Informe um período personalizado válido.");
      return;
    }
    setError("");
    setPeriodMode("custom");
    setCustomOpen(false);
  };

  const exportCsv = () => {
    if (!filtered.length) return;
    const rows = [
      ["Emissão", "Tipo", "Nota", "Série", "Chave", "Emitente", "CNPJ Emitente", "CNPJ Destinatário", "Valor", "NSU", "Evento"],
      ...filtered.map(d => [date(d.issueDate), d.documentKind === "evento" ? "evento" : d.direction || "", d.number || "", d.series || "", d.accessKey || "", d.issuerName || "", d.issuerCnpj || "", d.recipientCnpj || "", String(d.value || 0).replace(".", ","), d.nsu || "", eventDescription(d)]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notas-${String(company?.cnpj || "empresa").replace(/\D/g, "")}-${periodMode === "custom" ? `${customStart}-${customEnd}` : `${year}-${month}`}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return <AdminLayout><main className="mx-auto w-full max-w-[1560px] px-4 py-5 lg:px-7">
    {!loading && !company ? <section className="mx-auto mt-20 max-w-xl rounded-2xl bg-muted/15 p-10 text-center">
      <Building2 className="mx-auto h-8 w-8" />
      <h1 className="mt-4 text-xl font-semibold">Cadastre uma empresa fiscal</h1>
      <p className="mt-2 text-sm text-muted-foreground">A área de notas usa o certificado e as configurações cadastradas em Empresas.</p>
      <Button className="mt-6" onClick={() => navigate("/admin/fiscal/empresas")}>Ir para Empresas</Button>
    </section> : <>
      <section className="rounded-2xl bg-muted/10 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm"><Building2 className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-muted-foreground">Empresa selecionada</p>
              <div className="mt-1 flex items-center gap-1">
                <select className="max-w-[520px] cursor-pointer bg-transparent text-lg font-semibold outline-none" value={company?.id || ""} onChange={e => choose(e.target.value)}>{companies.map(c => <option className="bg-background" key={c.id} value={c.id}>{c.razao_social}</option>)}</select>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">{formatCnpj(company?.cnpj || "")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SoftPill>NF-e</SoftPill><SoftPill>NFC-e</SoftPill><SoftPill>NF-e ent.</SoftPill>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${certValid ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
              <ShieldCheck className="h-3.5 w-3.5" />{certValid ? "Certificado válido" : "Certificado pendente"}
            </span>
          </div>
        </div>
      </section>

      <section className="relative mt-4 rounded-2xl bg-muted/10 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => changeYear(-1)} className="rounded-lg px-2 py-1.5 text-muted-foreground transition hover:bg-background">‹</button>
          <span className="min-w-16 text-lg font-semibold">{year}</span>
          <button disabled={year >= currentYear} onClick={() => changeYear(1)} className="rounded-lg px-2 py-1.5 text-muted-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-25">›</button>
          <div className="ml-2 flex flex-1 flex-wrap gap-1">
            {MONTHS.map(m => {
              const future = m !== "Ano" && year === currentYear && MONTH_INDEX[m] > currentMonth;
              const active = periodMode === "month" && month === m;
              return <button key={m} disabled={future} onClick={() => chooseMonth(m)} className={`min-w-11 rounded-xl px-3 py-2 text-sm font-medium transition ${active ? "bg-background text-foreground shadow-sm" : future ? "cursor-not-allowed text-muted-foreground/25" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}>{m}</button>;
            })}
          </div>
          <Button variant="ghost" className={`rounded-full ${periodMode === "custom" ? "bg-background shadow-sm" : ""}`} onClick={() => setCustomOpen(v => !v)}>
            <CalendarDays className="mr-2 h-4 w-4" />{periodMode === "custom" ? `${date(customStart)} — ${date(customEnd)}` : "Personalizado"}
          </Button>
        </div>
        {customOpen && <div className="absolute right-4 top-[calc(100%+8px)] z-30 w-[360px] rounded-2xl bg-background p-4 shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
          <div className="flex items-center justify-between"><div><p className="font-semibold">Período personalizado</p><p className="mt-1 text-xs text-muted-foreground">A data final não pode ultrapassar hoje.</p></div><button onClick={() => setCustomOpen(false)} className="rounded-full p-2 hover:bg-muted"><X className="h-4 w-4" /></button></div>
          <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs font-medium text-muted-foreground">Início<Input className="mt-1.5" type="date" max={today} value={customStart} onChange={e => setCustomStart(e.target.value)} /></label><label className="text-xs font-medium text-muted-foreground">Fim<Input className="mt-1.5" type="date" min={customStart} max={today} value={customEnd} onChange={e => setCustomEnd(e.target.value)} /></label></div>
          <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => setCustomOpen(false)}>Cancelar</Button><Button size="sm" onClick={applyCustom}>Aplicar período</Button></div>
        </div>}
      </section>

      <section className="mt-3 grid gap-2 md:grid-cols-4">
        <Kpi label="Total notas" value={String(fiscalDocs.length)} />
        <Kpi label="Com XML" value={`${withXml.length}`} sub={`${fiscalDocs.length ? Math.round(withXml.length / fiscalDocs.length * 100) : 0}% dos documentos`} />
        <Kpi label="Sem XML" value={String(fiscalDocs.length - withXml.length)} />
        <Kpi label="Faturamento" value={money(emitted.reduce((s, d) => s + Number(d.value || 0), 0))} sub={`Recebidas: ${money(received.reduce((s, d) => s + Number(d.value || 0), 0))}`} />
      </section>

      <section className="mt-3 overflow-hidden rounded-2xl bg-background shadow-sm ring-1 ring-black/[.04] dark:ring-white/[.06]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <FilterPill active={filter === "saida"} onClick={() => setFilter("saida")}>↗ Emitidas <b>{emitted.length}</b></FilterPill>
            <FilterPill active={filter === "entrada"} onClick={() => setFilter("entrada")}>↙ Recebidas <b>{received.length}</b></FilterPill>
            <FilterPill active={filter === "todos"} onClick={() => setFilter("todos")}>Todas <b>{periodDocs.length}</b></FilterPill>
            <FilterPill active={filter === "evento"} onClick={() => setFilter("evento")}>Eventos <b>{events.length}</b></FilterPill>
            <FilterPill active={filter === "cancelada"} onClick={() => setFilter("cancelada")}>⊘ Canceladas <b>{cancelled.length}</b></FilterPill>
          </div>
          <div className="text-xs text-muted-foreground">Última busca: {company?.last_sync_at ? `${date(company.last_sync_at)} ${time(company.last_sync_at)}` : "ainda não sincronizada"}</div>
        </div>

        <div className="flex items-center gap-2 px-4 pb-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="border-0 bg-muted/30 pl-9 shadow-none focus-visible:ring-1" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por número, chave, empresa, CNPJ, NSU ou evento..." /></div>
          <Button variant="ghost" size="icon" title={certValid ? "Sincronizar" : "Configure um certificado válido"} onClick={sync} disabled={syncing || !certValid}>{syncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</Button>
          <Button variant="ghost" onClick={exportCsv} disabled={!filtered.length}><Download className="mr-2 h-4 w-4" />Download</Button>
        </div>

        {syncNotice && <div className="mx-4 mb-3 rounded-xl bg-emerald-500/8 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{syncNotice}</div>}
        {error && <div className="mx-4 mb-3 rounded-xl bg-destructive/8 px-4 py-3 text-sm text-destructive">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-muted/20 text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Emissão</th><th className="px-4 py-3">XML</th><th className="px-4 py-3">Nota / Chave</th><th className="px-4 py-3">Destinatário / Emitente</th><th className="px-4 py-3">Operação</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
            <tbody>{pageDocs.length ? pageDocs.map((d, i) => {
              const isEvent = d.documentKind === "evento";
              const eventName = eventDescription(d);
              return <tr key={`${d.nsu}-${d.accessKey}-${i}`} className="transition hover:bg-muted/10">
                <td className="px-4 py-3.5"><p className="font-semibold">{date(d.issueDate)}</p><p className="text-xs text-muted-foreground">{time(d.issueDate)}</p></td>
                <td className="px-4 py-3.5"><p className={d.fullXml ? "font-medium" : "text-muted-foreground"}>{isEvent ? "Evento" : d.fullXml ? "Disponível" : "Resumo"}</p><p className="text-xs text-muted-foreground">{isEvent ? "XML do evento" : d.fullXml ? "XML completo" : "Sem XML completo"}</p></td>
                <td className="px-4 py-3.5">{isEvent ? <><div className="flex items-center gap-2"><span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">EVENTO</span><b className="text-xs">{eventName}</b></div><p className="mt-1 max-w-64 truncate text-[10px] text-muted-foreground">{d.accessKey}</p></> : <><div className="flex items-center gap-2"><b>{d.number || "—"}</b><span className="text-xs text-muted-foreground">/ {d.series || "1"}</span><span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-semibold">{d.direction === "saida" ? "NF-e" : "NF-e ent."}</span></div><p className="mt-1 max-w-44 truncate text-[10px] text-muted-foreground">{d.accessKey}</p></>}</td>
                <td className="px-4 py-3.5"><p className="max-w-[280px] truncate font-medium">{isEvent ? "Documento fiscal relacionado" : d.direction === "saida" ? (d.recipientCnpj || "Consumidor") : (d.issuerName || "—")}</p><p className="text-xs text-muted-foreground">{isEvent ? d.accessKey : d.direction === "saida" ? d.recipientCnpj : d.issuerCnpj}</p></td>
                <td className="px-4 py-3.5"><p className="max-w-[280px] truncate">{isEvent ? eventName : d.direction === "saida" ? "Venda de mercadoria" : "Compra / documento recebido"}</p><p className="text-xs text-muted-foreground">{isEvent ? `cStat ${d.statusCode || "—"} · NSU ${d.nsu || "—"}` : d.schema || "DF-e"}</p></td>
                <td className="px-4 py-3.5 text-right font-semibold">{isEvent ? "—" : money(Number(d.value || 0))}</td>
                <td className="px-4 py-3.5"><div className="flex justify-end"><Button size="sm" variant="ghost" onClick={() => setSelected(d)}><FileText className="mr-1.5 h-4 w-4" />Visualizar</Button></div></td>
              </tr>;
            }) : <tr><td colSpan={7} className="h-48 px-4 text-center text-sm text-muted-foreground">Nenhum documento neste filtro/período.</td></tr>}</tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-muted-foreground">
          <span>{filtered.length ? `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} de ${filtered.length} documento(s)` : "0 documento(s)"}</span>
          <div className="flex items-center gap-1"><button disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="rounded-lg px-3 py-2 hover:bg-muted disabled:opacity-25">‹</button><span className="px-2">{safePage} / {totalPages}</span><button disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="rounded-lg px-3 py-2 hover:bg-muted disabled:opacity-25">›</button></div>
        </div>
      </section>
    </>}
    {selected && <FiscalDocumentPreview doc={selected} onClose={() => setSelected(null)} />}
  </main></AdminLayout>;
}

function SoftPill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-muted/45 px-3 py-1 text-xs font-medium text-muted-foreground">{children}</span>;
}
function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${active ? "bg-foreground text-background shadow-sm" : "bg-muted/35 text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>{children}</button>;
}
function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="rounded-2xl bg-muted/10 px-5 py-4"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">{label}</p><p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>{sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}</div>;
}
