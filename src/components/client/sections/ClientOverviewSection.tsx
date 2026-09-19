import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentActions } from "@/hooks/document/useDocumentActions";
import type { Document } from "@/utils/auth/types";

type OverviewProps = {
  documents: Document[];
  categories?: Array<{ id: string; name: string; color?: string }>;
  setActiveTab: (tab: string) => void;
};

type CompanySummary = { company_name: string | null; trade_name: string | null; cnpj: string | null };
type FiscalEvent = { id: string; title: string; date: string; status: string | null; category: string | null };
type Announcement = { id: string; title: string; message: string; created_at: string };

const formatCnpj = (value?: string | null) => {
  const d = String(value || "").replace(/\D/g, "");
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : value || "—";
};

const monthLabel = () => new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date());

export function ClientOverviewSection({ documents, categories = [], setActiveTab }: OverviewProps) {
  const { user, userData } = useAuth();
  const { loadingDocumentIds, handleDownload } = useDocumentActions();
  const [company, setCompany] = useState<CompanySummary | null>(null);
  const [events, setEvents] = useState<FiscalEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      if (!user?.id) {
        if (alive) setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: link } = await (supabase as any)
          .from("company_user_links")
          .select("company_id,is_primary")
          .eq("user_id", user.id)
          .order("is_primary", { ascending: false })
          .limit(1)
          .maybeSingle();

        const companyPromise = link?.company_id
          ? (supabase as any).from("companies").select("company_name,trade_name,cnpj").eq("id", link.company_id).maybeSingle()
          : Promise.resolve({ data: null });

        const nowIso = new Date().toISOString();
        const [companyResult, eventsResult, announcementsResult] = await Promise.all([
          companyPromise,
          (supabase as any).from("fiscal_events").select("id,title,date,status,category").gte("date", nowIso).order("date", { ascending: true }).limit(5),
          (supabase as any).from("client_announcements").select("id,title,message,created_at,expires_at").order("created_at", { ascending: false }).limit(5),
        ]);

        if (!alive) return;
        setCompany(companyResult?.data || null);
        setEvents((eventsResult?.data || []) as FiscalEvent[]);
        setAnnouncements(
          ((announcementsResult?.data || []) as any[])
            .filter(item => !item.expires_at || new Date(item.expires_at) > new Date())
            .slice(0, 4)
        );
      } catch (error) {
        console.error("Erro ao carregar resumo do portal:", error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const activeDocuments = useMemo(() => documents.filter(doc => !doc.status || doc.status === "active"), [documents]);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthDocuments = activeDocuments.filter(doc => new Date(doc.uploaded_at) >= monthStart);
  const newDocuments = activeDocuments.filter(doc => !doc.viewed).length;
  const nextEvent = events[0] || null;
  const recentDocuments = [...activeDocuments]
    .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
    .slice(0, 6);

  const displayName = String(
    company?.trade_name || company?.company_name || userData?.name || userData?.fullname || user?.email?.split("@")[0] || "cliente"
  ).trim();

  const stats = [
    { label: "Documentos no mês", value: monthDocuments.length },
    { label: "Novos para você", value: newDocuments },
    { label: "Próximo vencimento", value: nextEvent ? new Date(nextEvent.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—" },
    { label: "Comunicados", value: announcements.length },
  ];

  return (
    <div className="client-overview">
      <section className="client-overview-intro">
        <div>
          <span className="client-overview-kicker">Portal do cliente</span>
          <h1>Boa tarde, {displayName}.</h1>
          <p>{company?.cnpj ? formatCnpj(company.cnpj) + " · " : ""}Competência {monthLabel()}.</p>
        </div>
        <button className="client-overview-company-link" onClick={() => setActiveTab("company")}>
          Minha empresa <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <section className="client-overview-stats" aria-label="Resumo da empresa">
        {stats.map(item => (
          <div key={item.label} className="client-overview-stat">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </section>

      <div className="client-overview-grid">
        <section className="client-overview-primary">
          <header className="client-overview-section-head">
            <div><span className="client-overview-kicker">Documentos</span><h2>Recebidos recentemente</h2></div>
            <button onClick={() => setActiveTab("documents")}>Ver todos</button>
          </header>
          <div className="client-overview-document-list">
            {recentDocuments.length ? recentDocuments.map(doc => {
              const category = categories.find(cat => cat.id === doc.category)?.name || "Documento";
              const loadingDoc = loadingDocumentIds.has(doc.id);
              return (
                <div className="client-overview-document-row" key={doc.id}>
                  <div className="client-overview-document-main">
                    <span className="client-overview-document-status" data-new={!doc.viewed || undefined} />
                    <div><strong>{doc.name}</strong><span>{category}</span></div>
                  </div>
                  <time>{new Date(doc.uploaded_at).toLocaleDateString("pt-BR")}</time>
                  <span className={"client-overview-status-text " + (doc.viewed ? "is-viewed" : "is-new")}>{doc.viewed ? "Visualizado" : "Novo"}</span>
                  <button className="client-overview-download" onClick={() => void handleDownload(doc)} disabled={loadingDoc} aria-label={"Baixar " + doc.name}>
                    <FileDown className="h-4 w-4" />
                  </button>
                </div>
              );
            }) : <div className="client-overview-empty">Nenhum documento disponível no momento.</div>}
          </div>
        </section>

        <aside className="client-overview-side">
          <section className="client-overview-side-panel">
            <header className="client-overview-section-head compact">
              <div><span className="client-overview-kicker">Agenda</span><h2>Próximos compromissos</h2></div>
              <button onClick={() => setActiveTab("calendar")}>Abrir agenda</button>
            </header>
            <div className="client-overview-events">
              {events.length ? events.slice(0, 4).map(event => (
                <div className="client-overview-event" key={event.id}>
                  <time><strong>{new Date(event.date).toLocaleDateString("pt-BR", { day: "2-digit" })}</strong><span>{new Date(event.date).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span></time>
                  <div><strong>{event.title}</strong><span>{event.category || "Obrigação"}</span></div>
                </div>
              )) : <div className="client-overview-empty small">Nenhum compromisso próximo.</div>}
            </div>
          </section>

          <section className="client-overview-side-panel">
            <header className="client-overview-section-head compact">
              <div><span className="client-overview-kicker">Escritório</span><h2>Últimos avisos</h2></div>
              <button onClick={() => setActiveTab("announcements")}>Ver avisos</button>
            </header>
            <div className="client-overview-announcements">
              {announcements.length ? announcements.slice(0, 3).map(item => (
                <div key={item.id}><strong>{item.title}</strong><p>{item.message}</p><time>{new Date(item.created_at).toLocaleDateString("pt-BR")}</time></div>
              )) : <div className="client-overview-empty small">Nenhum comunicado ativo.</div>}
            </div>
          </section>
        </aside>
      </div>

      {loading && <span className="client-overview-loading">Atualizando informações…</span>}
    </div>
  );
}
