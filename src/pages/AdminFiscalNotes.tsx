import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  Info,
  Loader2,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { FiscalDocumentPreviewModal } from '@/components/admin/fiscal/FiscalDocumentPreviewModal';
import { FiscalDownloadCenter } from '@/components/admin/fiscal/FiscalDownloadCenter';
import {
  FiscalDocumentLike,
  docModel,
  docType,
  fiscalStatusLabel,
  formatCnpj,
  formatDate,
  formatMoney,
  formatTime,
  isCancelledDocument,
  onlyDigits,
} from '@/components/admin/fiscal/fiscalDocumentPreviewUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useCompanySelection } from '@/contexts/CompanySelectionContext';

type Company = {
  id: string;
  company_id?: string | null;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string | null;
  uf?: string;
  ambiente_padrao?: 'producao' | 'homologacao';
  last_sync_at?: string;
};

type Doc = FiscalDocumentLike & { monthKey?: string };
type Filter = 'saida' | 'entrada' | 'todos' | 'cancelada' | 'evento';
type TypeFilter = 'todos' | 'nfe' | 'nfce' | 'nfse';
type PeriodMode = 'month' | 'custom';

type ManifestResult = { kind: 'success' | 'pending' | 'error'; message: string };

const MONTHS = ['Ano', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const;
const MONTH_INDEX: Record<string, number> = { Jan: 0, Fev: 1, Mar: 2, Abr: 3, Mai: 4, Jun: 5, Jul: 6, Ago: 7, Set: 8, Out: 9, Nov: 10, Dez: 11 };
const PAGE_SIZE = 50;

const normalizeName = (value?: string | null) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();

const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const keyMonthKey = (key?: string) => (/^\d{44}$/.test(String(key || '')) ? String(key).slice(2, 6) : '');

function rowToDoc(row: any): Doc {
  return {
    companyId: row.company_id,
    nsu: row.nsu,
    schema: row.schema_name,
    source: row.source,
    documentKind: row.document_kind,
    fullXml: row.full_xml,
    direction: row.direction,
    accessKey: row.access_key,
    model: row.model,
    issueDate: row.issue_date,
    monthKey: keyMonthKey(row.access_key),
    value: row.value == null ? undefined : Number(row.value),
    issuerCnpj: row.issuer_cnpj,
    issuerName: row.issuer_name,
    recipientCnpj: row.recipient_cnpj,
    recipientName: row.recipient_name,
    number: row.note_number,
    series: row.series,
    statusCode: row.status_code,
    statusText: row.status_text,
    xml: row.xml,
    parseError: row.parse_error,
  };
}

function reconciliationToDoc(row: any): Doc {
  const key = String(row.access_key || '');
  const cancelled = String(row.status || '') === 'cancelled';
  const found = String(row.status || '') === 'found';
  return {
    documentKind: 'nfe',
    fullXml: false,
    direction: 'saida',
    accessKey: key,
    model: String(row.model || key.slice(20, 22) || '65'),
    issueDate: row.issue_date || undefined,
    monthKey: keyMonthKey(key),
    value: row.value != null ? Number(row.value) : undefined,
    number: row.note_number != null ? String(row.note_number) : '',
    series: row.series != null ? String(row.series) : '',
    statusCode: row.cstat != null ? String(row.cstat) : undefined,
    statusText:
      row.xmotivo ||
      (cancelled ? 'Cancelada' : found && String(row.cstat || '') === '100' ? 'Autorizada' : found ? 'Encontrada' : undefined),
  };
}

const docPriority = (document: Doc) =>
  document.fullXml && document.xml
    ? 100
    : document.parseError === 'xml_requires_manifestation'
      ? 80
      : document.parseError === 'xml_retry:manifestation_sent'
        ? 70
        : document.documentKind === 'nfe'
          ? 50
          : document.documentKind === 'resumo'
            ? 40
            : 10;

function dedupeDocs(items: Doc[]) {
  const map = new Map<string, Doc>();
  items.forEach((document, index) => {
    const key = document.accessKey || `${document.nsu || 'sem-nsu'}:${document.direction || ''}:${document.number || ''}:${document.issueDate || ''}:${index}`;
    const previous = map.get(key);
    if (!previous || docPriority(document) > docPriority(previous)) map.set(key, document);
  });
  return [...map.values()];
}

async function resolveFiscalCompany(selectedCompany: any): Promise<Company | null> {
  if (!selectedCompany) return null;
  const db = supabase as any;
  const columns = 'id,company_id,cnpj,razao_social,nome_fantasia,uf,ambiente_padrao,last_sync_at,status';
  const fiscalId = String(selectedCompany.fiscal_company_id || '');
  if (fiscalId) {
    const { data } = await db.from('fiscal_companies').select(columns).eq('id', fiscalId).neq('status', 'inativa').maybeSingle();
    if (data) return data as Company;
  }
  if (selectedCompany.id) {
    const { data } = await db.from('fiscal_companies').select(columns).eq('company_id', selectedCompany.id).neq('status', 'inativa').maybeSingle();
    if (data) return data as Company;
  }
  const cnpj = onlyDigits(selectedCompany.cnpj);
  if (cnpj) {
    const { data } = await db.from('fiscal_companies').select(columns).eq('cnpj', cnpj).neq('status', 'inativa').maybeSingle();
    if (data) return data as Company;
  }
  const aliases = new Set([normalizeName(selectedCompany.company_name), normalizeName(selectedCompany.trade_name)].filter(Boolean));
  if (!aliases.size) return null;
  const { data } = await db.from('fiscal_companies').select(columns).neq('status', 'inativa');
  const matches = (data || []).filter((row: any) => aliases.has(normalizeName(row.razao_social)) || aliases.has(normalizeName(row.nome_fantasia)));
  return matches.length === 1 ? (matches[0] as Company) : null;
}

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export default function AdminFiscalNotes() {
  const navigate = useNavigate();
  const { selectedCompany, companies } = useCompanySelection();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const today = isoDate(now);

  const docsRequestRef = useRef(0);
  const recoveryAttemptsRef = useRef<Record<string, number>>({});
  const selectedCompanyKeyRef = useRef('');

  const [company, setCompany] = useState<Company | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [remoteStats, setRemoteStats] = useState<Record<string, { sales: number; purchases: number }>>({});

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<(typeof MONTHS)[number]>(MONTHS[currentMonth + 1]);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState(isoDate(new Date(currentYear, currentMonth, 1)));
  const [customEnd, setCustomEnd] = useState(today);
  const [filter, setFilter] = useState<Filter>('todos');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [manifestationOnly, setManifestationOnly] = useState(false);

  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [xmlBusy, setXmlBusy] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);

  const [manifestDoc, setManifestDoc] = useState<Doc | null>(null);
  const [manifestBusy, setManifestBusy] = useState(false);
  const [manifestResult, setManifestResult] = useState<ManifestResult | null>(null);

  const loadDocs = async (target: Company | null, clear = false) => {
    const request = ++docsRequestRef.current;
    if (!target) {
      if (clear) setDocs([]);
      return;
    }
    try {
      const [{ data, error: documentsError }, { data: stats }] = await Promise.all([
        supabase.functions.invoke('admin-fiscal-documents', { body: { company_id: target.id } }),
        supabase.functions.invoke('admin-fiscal-monthly-stats', { body: { company_id: target.id, year } }),
      ]);
      if (documentsError) throw documentsError;
      const base = (data?.documents || []).map(rowToDoc);
      const known = new Set(base.map((document: Doc) => String(document.accessKey || '')).filter(Boolean));
      const extra = (data?.reconciliation || [])
        .filter((row: any) => /^\d{44}$/.test(String(row.access_key || '')) && !known.has(String(row.access_key)))
        .map((row: any) => ({ ...reconciliationToDoc(row), companyId: target.id }));
      if (request !== docsRequestRef.current) return;
      setDocs(dedupeDocs([...base, ...extra]));
      if (stats?.months) setRemoteStats(stats.months);
      setError('');
    } catch (caught) {
      if (request !== docsRequestRef.current) return;
      setError(caught instanceof Error ? caught.message : String(caught));
      if (clear) setDocs([]);
    }
  };

  useEffect(() => {
    let active = true;
    const key = String(selectedCompany?.id || selectedCompany?.cnpj || '');
    const changed = key !== selectedCompanyKeyRef.current;
    if (changed) {
      selectedCompanyKeyRef.current = key;
      docsRequestRef.current += 1;
      recoveryAttemptsRef.current = {};
      setRecoveryBusy(false);
      setDocs([]);
      setError('');
      setPage(1);
      setQuery('');
      setFilter('todos');
      setTypeFilter('todos');
      setManifestationOnly(false);
      setManifestDoc(null);
      setManifestResult(null);
      setPreviewDoc(null);
    }
    setLoading(true);
    void resolveFiscalCompany(selectedCompany)
      .then(next => active && setCompany(next))
      .catch(caught => {
        if (!active) return;
        setCompany(null);
        setError(caught instanceof Error ? caught.message : String(caught));
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [selectedCompany?.id, selectedCompany?.fiscal_company_id, selectedCompany?.cnpj, selectedCompany?.company_name, selectedCompany?.trade_name]);

  useEffect(() => {
    if (company) void loadDocs(company, docs.length === 0);
  }, [company?.id, year]);

  useEffect(() => {
    if (!company) return;
    const refresh = () => void loadDocs(company, false);
    const timer = window.setInterval(refresh, 15000);
    const onVisibility = () => document.visibilityState === 'visible' && refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [company?.id, year]);

  useEffect(() => {
    if (!company || recoveryBusy) return;
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const next = docs.find(document =>
      document.documentKind !== 'evento' &&
      !(document.fullXml && document.xml) &&
      document.parseError !== 'xml_requires_manifestation' &&
      document.parseError !== 'xml_retry:manifestation_sent' &&
      /^\d{44}$/.test(String(document.accessKey || '')) &&
      ['55', '65'].includes(docModel(document)) &&
      Boolean(document.issueDate) &&
      new Date(String(document.issueDate)).getTime() >= cutoff &&
      (recoveryAttemptsRef.current[String(document.accessKey)] || 0) < 2
    );
    if (!next) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      const key = String(next.accessKey);
      recoveryAttemptsRef.current[key] = (recoveryAttemptsRef.current[key] || 0) + 1;
      setRecoveryBusy(true);
      try {
        await supabase.functions.invoke('fiscal-document-recover', { body: { company_id: company.id, access_key: next.accessKey, nsu: next.nsu } });
      } catch {
        // A rotina recorrente continuará tentando; a UI não precisa interromper o usuário.
      } finally {
        if (!cancelled) {
          await loadDocs(company, false);
          setRecoveryBusy(false);
        }
      }
    }, 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [company?.id, docs, recoveryBusy]);

  useEffect(() => setPage(1), [year, month, periodMode, customStart, customEnd, filter, typeFilter, query, manifestationOnly]);

  const periodDocs = useMemo(
    () =>
      docs.filter(document => {
        if (!document.issueDate) {
          if (document.monthKey && /^\d{4}$/.test(document.monthKey)) {
            if (periodMode === 'custom') return false;
            const keyYear = 2000 + Number(document.monthKey.slice(0, 2));
            const keyMonth = Number(document.monthKey.slice(2, 4)) - 1;
            if (keyYear !== year) return false;
            return month === 'Ano' || keyMonth === MONTH_INDEX[month];
          }
          return periodMode === 'month' && month === 'Ano';
        }
        const date = new Date(document.issueDate);
        if (Number.isNaN(date.getTime())) return false;
        if (periodMode === 'custom') {
          const value = isoDate(date);
          return value >= customStart && value <= customEnd;
        }
        if (date.getFullYear() !== year) return false;
        if (month !== 'Ano' && date.getMonth() !== MONTH_INDEX[month]) return false;
        return true;
      }),
    [docs, year, month, periodMode, customStart, customEnd]
  );

  const emitted = periodDocs.filter(document => document.direction === 'saida' && document.documentKind !== 'evento');
  const received = periodDocs.filter(document => document.direction === 'entrada' && document.documentKind !== 'evento');
  const events = periodDocs.filter(document => document.documentKind === 'evento');
  const cancelled = periodDocs.filter(document => document.documentKind !== 'evento' && isCancelledDocument(document));
  const manifestationDocs = periodDocs.filter(document => document.parseError === 'xml_requires_manifestation');
  const fiscalDocs = periodDocs.filter(document => document.documentKind !== 'evento');
  const nfeCount = fiscalDocs.filter(document => docType(document) === 'NF-e').length;
  const nfceCount = fiscalDocs.filter(document => docType(document) === 'NFC-e').length;
  const nfseCount = fiscalDocs.filter(document => docType(document) === 'NFS-e').length;

  const filtered = useMemo(
    () =>
      periodDocs.filter(document => {
        if (manifestationOnly && document.parseError !== 'xml_requires_manifestation') return false;
        if (filter === 'saida' && (document.direction !== 'saida' || document.documentKind === 'evento')) return false;
        if (filter === 'entrada' && (document.direction !== 'entrada' || document.documentKind === 'evento')) return false;
        if (filter === 'evento' && document.documentKind !== 'evento') return false;
        if (filter === 'cancelada' && (document.documentKind === 'evento' || !isCancelledDocument(document))) return false;
        const type = docType(document);
        if (typeFilter === 'nfe' && type !== 'NF-e') return false;
        if (typeFilter === 'nfce' && type !== 'NFC-e') return false;
        if (typeFilter === 'nfse' && type !== 'NFS-e') return false;
        const normalizedQuery = query.trim().toLowerCase();
        return (
          !normalizedQuery ||
          [
            document.number,
            document.accessKey,
            document.issuerName,
            document.issuerCnpj,
            document.recipientCnpj,
            document.nsu,
            document.series,
            document.statusText,
            type,
            selectedCompany?.company_name,
            selectedCompany?.trade_name,
            selectedCompany?.cnpj,
          ].some(value => String(value || '').toLowerCase().includes(normalizedQuery))
        );
      }),
    [periodDocs, filter, typeFilter, query, manifestationOnly, selectedCompany?.company_name, selectedCompany?.trade_name, selectedCompany?.cnpj]
  );

  const monthStats = useMemo(
    () =>
      MONTHS.reduce((accumulator, label, index) => {
        const fiscal = docs.filter(document => {
          if (document.documentKind === 'evento') return false;
          const date = document.issueDate ? new Date(document.issueDate) : null;
          if (date && !Number.isNaN(date.getTime())) return date.getFullYear() === year && (index === 0 || date.getMonth() === index - 1);
          if (!document.monthKey || !/^\d{4}$/.test(document.monthKey)) return index === 0;
          return 2000 + Number(document.monthKey.slice(0, 2)) === year && (index === 0 || Number(document.monthKey.slice(2, 4)) === index);
        });
        accumulator[label] = {
          sales: fiscal.filter(document => document.direction === 'saida').length,
          purchases: fiscal.filter(document => document.direction === 'entrada').length,
        };
        return accumulator;
      }, {} as Record<(typeof MONTHS)[number], { sales: number; purchases: number }>),
    [docs, year]
  );

  const serverMonthStats = useMemo(
    () =>
      MONTHS.reduce((accumulator, label, index) => {
        if (index > 0) {
          const value = remoteStats[`${year}-${String(index).padStart(2, '0')}`];
          if (value) accumulator[label] = value;
        }
        return accumulator;
      }, {} as Record<(typeof MONTHS)[number], { sales: number; purchases: number }>),
    [remoteStats, year]
  );
  Object.assign(monthStats, serverMonthStats);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageDocs = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const certValid = selectedCompany?.certificate_status === 'valid';

  const fiscalFantasy = company?.nome_fantasia && normalizeName(company.nome_fantasia) !== normalizeName(company.razao_social) ? company.nome_fantasia : '';
  const selectedFantasy = selectedCompany?.trade_name && normalizeName(selectedCompany.trade_name) !== normalizeName(selectedCompany.company_name) ? selectedCompany.trade_name : '';

  const selectedPeriod = useMemo(() => {
    if (periodMode === 'custom') return { start: customStart, end: customEnd };
    if (month === 'Ano') return { start: `${year}-01-01`, end: `${year}-12-31` > today ? today : `${year}-12-31` };
    const start = isoDate(new Date(year, MONTH_INDEX[month], 1));
    const end = isoDate(new Date(year, MONTH_INDEX[month] + 1, 0));
    return { start, end: end > today ? today : end };
  }, [periodMode, customStart, customEnd, month, year, today]);

  const downloadCompanies = useMemo(
    () =>
      companies
        .filter(item => Boolean(item.fiscal_company_id))
        .map(item => ({ id: String(item.fiscal_company_id), name: item.trade_name || item.company_name })),
    [companies]
  );

  const chooseMonth = (next: (typeof MONTHS)[number]) => {
    if (next !== 'Ano' && year === currentYear && MONTH_INDEX[next] > currentMonth) return;
    setPeriodMode('month');
    setCustomOpen(false);
    setMonth(next);
  };

  const changeYear = (delta: number) => {
    const next = Math.min(currentYear, year + delta);
    setYear(next);
    setPeriodMode('month');
    setCustomOpen(false);
    if (next === currentYear && month !== 'Ano' && MONTH_INDEX[month] > currentMonth) setMonth(MONTHS[currentMonth + 1]);
  };

  const applyCustom = () => {
    if (!customStart || !customEnd || customStart > customEnd) {
      setError('Informe um período personalizado válido.');
      return;
    }
    setError('');
    setPeriodMode('custom');
    setCustomOpen(false);
  };

  const toggleType = (next: Exclude<TypeFilter, 'todos'>) => setTypeFilter(current => (current === next ? 'todos' : next));

  const openManifestation = (document: Doc) => {
    setPreviewDoc(null);
    setManifestDoc(document);
    setManifestResult(null);
  };

  const authorizeManifestation = async () => {
    if (!company || !manifestDoc?.accessKey) return;
    setManifestBusy(true);
    setManifestResult(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('admin-fiscal-manifest', {
        body: { company_id: company.id, access_key: manifestDoc.accessKey },
      });
      if (invokeError) throw invokeError;
      if (data?.error || data?.ok === false) throw new Error(String(data?.error || data?.result?.error || 'A SEFAZ não aceitou a manifestação.'));
      if (data?.recovered) {
        setManifestResult({ kind: 'success', message: 'Manifestação registrada e XML integral recuperado. A nota já está pronta para consulta e download.' });
      } else if (data?.registered) {
        setManifestResult({ kind: 'pending', message: 'Manifestação registrada com sucesso. A SEFAZ ainda está liberando o XML e o sistema continuará tentando automaticamente.' });
      } else {
        throw new Error('A manifestação não retornou confirmação da SEFAZ.');
      }
      await loadDocs(company, false);
    } catch (caught) {
      setManifestResult({ kind: 'error', message: caught instanceof Error ? caught.message : String(caught) });
    } finally {
      setManifestBusy(false);
    }
  };

  const ensureIntegralDocument = async (document: Doc) => {
    if (!company) throw new Error('Selecione uma empresa.');
    if (document.fullXml && document.xml) return document;
    if (document.parseError === 'xml_requires_manifestation') {
      openManifestation(document);
      throw new Error('Esta nota precisa de manifestação antes que a SEFAZ libere o XML.');
    }
    const { data, error: recoverError } = await supabase.functions.invoke('fiscal-document-recover', {
      body: { company_id: company.id, access_key: document.accessKey, nsu: document.nsu },
    });
    if (recoverError) throw recoverError;
    if (!data?.ready || !data?.document) throw new Error(String(data?.reason || 'O XML integral desta nota ainda não está disponível.'));
    const recovered = { ...rowToDoc(data.document), companyId: company.id };
    setDocs(current => dedupeDocs(current.map(item => ((item.accessKey && item.accessKey === recovered.accessKey) || (item.nsu && item.nsu === recovered.nsu) ? recovered : item))));
    setPreviewDoc(current => (current && current.accessKey === recovered.accessKey ? recovered : current));
    return recovered;
  };

  const downloadPdf = async (document: Doc) => {
    if (!company || document.documentKind === 'evento') return;
    setPdfBusy(true);
    setError('');
    try {
      const current = await ensureIntegralDocument(document);
      const { data, error: pdfError } = await supabase.functions.invoke('dfe-danfe-pdf', {
        body: { company_id: company.id, document: current },
      });
      if (pdfError) throw pdfError;
      const base64 = String(data?.pdf_base64 || '');
      if (!base64) throw new Error('O PDF oficial não foi gerado.');
      const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
      triggerDownload(new Blob([bytes], { type: 'application/pdf' }), String(data?.filename || `documento-${current.accessKey || current.number || 'fiscal'}.pdf`));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      if (!/precisa de manifestação/i.test(message)) setError(message);
    } finally {
      setPdfBusy(false);
    }
  };

  const downloadXml = async (document: Doc) => {
    if (!company || document.documentKind === 'evento') return;
    setXmlBusy(true);
    setError('');
    try {
      const current = await ensureIntegralDocument(document);
      if (!current.xml) throw new Error('O XML integral ainda não está disponível.');
      triggerDownload(new Blob([current.xml], { type: 'application/xml;charset=utf-8' }), `${docType(current).replace(/[^a-z0-9]/gi, '')}-${current.number || 'sem-numero'}-${current.accessKey || current.nsu || 'documento'}.xml`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      if (!/precisa de manifestação/i.test(message)) setError(message);
    } finally {
      setXmlBusy(false);
    }
  };

  return (
    <AdminLayout>
      <main className="ws-storage-style mx-auto w-full max-w-[1560px] px-4 py-5 lg:px-7">
        {!loading && !company ? (
          <section className="mx-auto mt-20 max-w-xl rounded-2xl bg-muted/15 p-10 text-center">
            <Building2 className="mx-auto h-8 w-8" />
            <h1 className="mt-4 text-xl font-semibold">Configuração fiscal pendente</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {selectedCompany
                ? `${selectedCompany.company_name}${selectedFantasy ? ` (${selectedFantasy})` : ''} ainda não possui um perfil fiscal vinculado por ID, CNPJ ou cadastro fiscal.`
                : 'Selecione uma empresa no topo para consultar as notas fiscais.'}
            </p>
            {selectedCompany && <Button className="mt-6" onClick={() => navigate(`/admin/clientes/${selectedCompany.id}/fiscal`)}>Configurar empresa</Button>}
          </section>
        ) : (
          <>
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/10 px-5 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-muted-foreground">Empresa ativa</p>
                <p className="mt-1 text-sm font-semibold">{company?.razao_social || selectedCompany?.company_name || '—'}</p>
                {(fiscalFantasy || selectedFantasy) && <p className="text-xs font-medium text-muted-foreground">{fiscalFantasy || selectedFantasy}</p>}
                <p className="text-[10px] text-muted-foreground/80">{formatCnpj(company?.cnpj || selectedCompany?.cnpj || '')}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${certValid ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>
                <ShieldCheck className="h-3.5 w-3.5" />{certValid ? 'Certificado válido' : 'Certificado pendente'}
              </span>
            </section>

            <section className="relative mt-4 rounded-2xl bg-muted/10 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => changeYear(-1)} className="rounded-lg px-2 py-1.5 text-muted-foreground">‹</button>
                <span className="min-w-16 text-lg font-semibold">{year}</span>
                <button disabled={year >= currentYear} onClick={() => changeYear(1)} className="rounded-lg px-2 py-1.5 text-muted-foreground disabled:opacity-25">›</button>
                <div className="ml-2 grid min-w-0 flex-1 grid-cols-4 gap-1 sm:grid-cols-7 xl:grid-cols-13">
                  {MONTHS.map(label => {
                    const future = label !== 'Ano' && year === currentYear && MONTH_INDEX[label] > currentMonth;
                    const active = periodMode === 'month' && month === label;
                    const stats = monthStats[label] || { sales: 0, purchases: 0 };
                    return (
                      <button key={label} disabled={future} onClick={() => chooseMonth(label)} title={`${stats.sales} venda(s) e ${stats.purchases} compra(s)`} className={`min-w-0 rounded-xl px-2 py-2 text-center transition ${active ? 'bg-background shadow-sm ring-1 ring-black/[.04]' : future ? 'text-muted-foreground/25' : 'text-muted-foreground hover:bg-background/70'}`}>
                        <span className="block text-sm font-semibold">{label}</span>
                        <span className="mt-1 block whitespace-nowrap text-[9px] font-medium tabular-nums"><span className="text-emerald-600">{stats.sales} V</span><span className="mx-1 opacity-30">·</span><span className="text-sky-600">{stats.purchases} C</span></span>
                      </button>
                    );
                  })}
                </div>
                <Button variant="ghost" className="rounded-full" onClick={() => setCustomOpen(value => !value)}><CalendarDays className="mr-2 h-4 w-4" />Personalizado</Button>
              </div>
              <p className="mt-2 pl-1 text-[10px] text-muted-foreground"><span className="font-semibold text-emerald-600">V</span> vendas · <span className="font-semibold text-sky-600">C</span> compras. Clique em um mês para abrir todas as notas do período.</p>
              {customOpen && (
                <div className="absolute right-4 top-[calc(100%+8px)] z-30 w-[360px] rounded-2xl bg-background p-4 shadow-2xl">
                  <div className="flex items-center justify-between"><b>Período personalizado</b><button onClick={() => setCustomOpen(false)}><X className="h-4 w-4" /></button></div>
                  <div className="mt-4 grid grid-cols-2 gap-3"><Input type="date" max={today} value={customStart} onChange={event => setCustomStart(event.target.value)} /><Input type="date" min={customStart} max={today} value={customEnd} onChange={event => setCustomEnd(event.target.value)} /></div>
                  <div className="mt-4 flex justify-end"><Button size="sm" onClick={applyCustom}>Aplicar</Button></div>
                </div>
              )}
            </section>

            <section className="mt-3 grid gap-2 md:grid-cols-4">
              <Kpi label="Total notas" value={String(fiscalDocs.length)} />
              <Kpi label="Vendas" value={String(emitted.length)} />
              <Kpi label="Compras" value={String(received.length)} />
              <Kpi label="Faturamento" value={formatMoney(emitted.reduce((sum, document) => sum + Number(document.value || 0), 0))} sub={`Entradas: ${formatMoney(received.reduce((sum, document) => sum + Number(document.value || 0), 0))}`} />
            </section>

            <section className="mt-3 overflow-hidden rounded-2xl bg-background shadow-sm ring-1 ring-black/[.04]">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <FilterPill active={filter === 'saida'} onClick={() => setFilter('saida')}>↗ Vendas <b>{emitted.length}</b></FilterPill>
                  <FilterPill active={filter === 'entrada'} onClick={() => setFilter('entrada')}>↙ Compras <b>{received.length}</b></FilterPill>
                  <FilterPill active={filter === 'todos'} onClick={() => setFilter('todos')}>Todas <b>{periodDocs.length}</b></FilterPill>
                  <FilterPill active={filter === 'evento'} onClick={() => setFilter('evento')}>Eventos <b>{events.length}</b></FilterPill>
                  <FilterPill active={filter === 'cancelada'} onClick={() => setFilter('cancelada')}>⊘ Canceladas <b>{cancelled.length}</b></FilterPill>
                  {manifestationDocs.length > 0 && <FilterPill active={manifestationOnly} onClick={() => setManifestationOnly(value => !value)}><span className="inline-flex items-center gap-1 text-amber-600"><Info className="h-3.5 w-3.5" />Manifestação <b>{manifestationDocs.length}</b></span></FilterPill>}
                  <span className="mx-1 h-5 w-px bg-border" />
                  <FilterPill active={typeFilter === 'nfe'} onClick={() => toggleType('nfe')}>NF-e <b>{nfeCount}</b></FilterPill>
                  <FilterPill active={typeFilter === 'nfce'} onClick={() => toggleType('nfce')}>NFC-e <b>{nfceCount}</b></FilterPill>
                  <FilterPill active={typeFilter === 'nfse'} onClick={() => toggleType('nfse')}>NFS-e <b>{nfseCount}</b></FilterPill>
                </div>
                <div className="text-xs text-muted-foreground">Última busca: {company?.last_sync_at ? `${formatDate(company.last_sync_at)} ${formatTime(company.last_sync_at)}` : 'automática'}</div>
              </div>

              <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
                <div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="border-0 bg-muted/30 pl-9" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por número, chave, razão social, CNPJ, tipo ou situação..." /></div>
                <Button onClick={() => setDownloadOpen(true)} disabled={!company}><Download className="mr-2 h-4 w-4" />Baixar</Button>
              </div>

              {error && <div className="mx-4 mb-3 rounded-xl bg-destructive/8 px-4 py-3 text-sm text-destructive">{error}</div>}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="bg-muted/20 text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Emissão</th><th className="px-4 py-3">Nota / Chave</th><th className="px-4 py-3">Destinatário / Emitente</th><th className="px-4 py-3">Operação</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
                  <tbody>
                    {pageDocs.length ? pageDocs.map((document, index) => {
                      const type = docType(document);
                      const status = fiscalStatusLabel(document);
                      const cancelledDocument = isCancelledDocument(document);
                      const isEvent = document.documentKind === 'evento';
                      const needsManifestation = document.parseError === 'xml_requires_manifestation';
                      const manifestationSent = document.parseError === 'xml_retry:manifestation_sent';
                      return (
                        <tr key={`${document.accessKey || document.nsu}-${index}`} role={isEvent ? undefined : 'button'} tabIndex={isEvent ? -1 : 0} onClick={() => !isEvent && setPreviewDoc(document)} onKeyDown={event => { if (!isEvent && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setPreviewDoc(document); } }} className={`ws-zebra-row ${cancelledDocument ? 'ws-zebra-cancelled' : ''} ${isEvent ? '' : 'cursor-pointer'} transition-colors`}>
                          <td className="px-4 py-3.5"><p className="font-semibold">{formatDate(document.issueDate)}</p><p className="text-xs text-muted-foreground">{formatTime(document.issueDate)}</p></td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <b>{document.number || '—'}</b><span className="text-xs text-muted-foreground">/ {document.series || '1'}</span>
                              {needsManifestation && <button type="button" title="Esta nota precisa de manifestação do destinatário" onClick={event => { event.stopPropagation(); openManifestation(document); }} className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/12 text-amber-600 transition hover:bg-amber-500/20"><Info className="h-4 w-4" /></button>}
                              <TypeTag type={type} /><StatusTag status={status} danger={cancelledDocument} warning={status === 'Denegada'} />
                            </div>
                            <p className="mt-1 max-w-52 truncate text-[10px] text-muted-foreground">{document.accessKey}</p>
                            {needsManifestation && <p className="mt-1 text-[10px] font-medium text-amber-600">Manifestação necessária para liberar o XML</p>}
                            {manifestationSent && <p className="mt-1 text-[10px] font-medium text-amber-600">Manifestação registrada · aguardando XML da SEFAZ</p>}
                          </td>
                          <td className="px-4 py-3.5"><p className="max-w-[280px] truncate font-medium">{isEvent ? 'Documento relacionado' : document.direction === 'saida' ? (document.recipientName || document.recipientCnpj || '—') : (document.issuerName || '—')}</p><p className="text-xs text-muted-foreground">{document.direction === 'saida' ? document.recipientCnpj : document.issuerCnpj}</p></td>
                          <td className="px-4 py-3.5"><p>{isEvent ? 'Evento fiscal' : document.direction === 'saida' ? 'Venda de mercadoria' : 'Entrada fiscal'}</p><p className="text-xs text-muted-foreground">{type} · {status}</p></td>
                          <td className="px-4 py-3.5 text-right font-semibold">{isEvent || document.value == null ? '—' : formatMoney(document.value)}</td>
                          <td className="px-4 py-3.5"><div className="flex justify-end">{isEvent ? <span className="text-xs text-muted-foreground">Evento</span> : <Button size="sm" variant="ghost" onClick={event => { event.stopPropagation(); setPreviewDoc(document); }}><Eye className="mr-1.5 h-4 w-4" />Visualizar</Button>}</div></td>
                        </tr>
                      );
                    }) : <tr><td colSpan={6} className="h-48 text-center text-muted-foreground">Nenhum documento neste filtro/período.</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground">
                <span>{filtered.length ? `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} de ${filtered.length}` : '0 documento(s)'}</span>
                <div><button disabled={safePage <= 1} onClick={() => setPage(value => Math.max(1, value - 1))} className="rounded-lg px-3 py-2 disabled:opacity-25">‹</button><span className="px-2">{safePage} / {totalPages}</span><button disabled={safePage >= totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))} className="rounded-lg px-3 py-2 disabled:opacity-25">›</button></div>
              </div>
            </section>
          </>
        )}

        <FiscalDocumentPreviewModal
          document={previewDoc}
          companyName={company?.razao_social || selectedCompany?.company_name || ''}
          companyCnpj={company?.cnpj || selectedCompany?.cnpj || ''}
          downloadingPdf={pdfBusy}
          downloadingXml={xmlBusy}
          onClose={() => setPreviewDoc(null)}
          onDownloadPdf={document => downloadPdf(document as Doc)}
          onDownloadXml={document => downloadXml(document as Doc)}
          onManifestation={document => openManifestation(document as Doc)}
        />

        <FiscalDownloadCenter
          open={downloadOpen}
          currentCompany={company ? { id: company.id, name: company.nome_fantasia || company.razao_social } : null}
          companies={downloadCompanies}
          initialStart={selectedPeriod.start}
          initialEnd={selectedPeriod.end}
          initialDirection={filter === 'entrada' ? 'entrada' : filter === 'saida' ? 'saida' : 'todos'}
          onClose={() => setDownloadOpen(false)}
        />

        {manifestDoc && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md" onMouseDown={event => { if (event.target === event.currentTarget && !manifestBusy) { setManifestDoc(null); setManifestResult(null); } }}>
            <div className="w-full max-w-lg rounded-2xl bg-background p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div><div className="flex items-center gap-2 text-amber-600"><Info className="h-5 w-5" /><p className="text-xs font-semibold uppercase tracking-wide">Manifestação do destinatário</p></div><h2 className="mt-2 text-lg font-semibold">NF-e {manifestDoc.number || '—'}</h2><p className="mt-1 text-sm text-muted-foreground">{manifestDoc.issuerName || manifestDoc.issuerCnpj || 'Emitente não identificado'}</p></div>
                <button disabled={manifestBusy} onClick={() => { setManifestDoc(null); setManifestResult(null); }} className="rounded-full p-2 hover:bg-muted disabled:opacity-50"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-5 rounded-xl bg-amber-500/8 p-4 text-sm leading-6 text-foreground"><p>A SEFAZ informou que o XML integral desta nota só pode ser liberado depois da manifestação do destinatário. A WS registra a manifestação com o certificado A1 da empresa e tenta recuperar o XML automaticamente depois da confirmação.</p><p className="mt-2 break-all text-xs text-muted-foreground">Chave: {manifestDoc.accessKey}</p></div>
              {manifestResult && <div className={`mt-4 flex items-start gap-3 rounded-xl p-4 text-sm ${manifestResult.kind === 'success' ? 'bg-emerald-500/10 text-emerald-700' : manifestResult.kind === 'pending' ? 'bg-amber-500/10 text-amber-700' : 'bg-red-500/10 text-red-700'}`}>{manifestResult.kind === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}<span>{manifestResult.message}</span></div>}
              <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" disabled={manifestBusy} onClick={() => { setManifestDoc(null); setManifestResult(null); }}>Fechar</Button><Button disabled={manifestBusy || manifestResult?.kind === 'success'} onClick={() => void authorizeManifestation()}>{manifestBusy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Confirmando na SEFAZ...</> : manifestResult?.kind === 'pending' ? 'Tentar recuperar XML novamente' : 'Autorizar manifestação e recuperar XML'}</Button></div>
            </div>
          </div>
        )}
      </main>
    </AdminLayout>
  );
}

function TypeTag({ type }: { type: string }) {
  const className = type === 'NFS-e' ? 'bg-violet-500/10 text-violet-700' : type === 'NFC-e' ? 'bg-orange-500/10 text-orange-700' : type === 'Evento' ? 'bg-amber-500/10 text-amber-700' : 'bg-sky-500/10 text-sky-700';
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${className}`}>{type}</span>;
}

function StatusTag({ status, danger, warning }: { status: string; danger?: boolean; warning?: boolean }) {
  const className = danger ? 'bg-red-500/10 text-red-700' : warning ? 'bg-amber-500/10 text-amber-700' : status === 'Autorizada' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted/55 text-muted-foreground';
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${className}`}>{status}</span>;
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-full px-3 py-1.5 text-xs font-medium ${active ? 'bg-foreground text-background shadow-sm' : 'bg-muted/35 text-muted-foreground hover:bg-muted/60'}`}>{children}</button>;
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="rounded-2xl bg-muted/10 px-5 py-4"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p>{sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}</div>;
}
