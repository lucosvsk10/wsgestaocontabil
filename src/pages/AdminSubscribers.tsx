import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileText,
  KeyRound,
  LockKeyhole,
  Mail,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import {
  AdminEmptyState,
  AdminLoadingState,
  AdminPage,
  AdminPageHeader,
  AdminSection,
} from "@/components/admin/ui/AdminPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Product = "issuer" | "extractor";

type Person = {
  id: string | null;
  name: string | null;
  email: string | null;
  created_at: string | null;
  last_login_at: string | null;
  email_confirmed_at: string | null;
};

type Invoice = {
  id: string;
  invoice_number?: number | null;
  description?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  due_date?: string | null;
  total_cents?: number | null;
  status?: string | null;
  payment_method?: string | null;
  paid_at?: string | null;
  provider_status?: string | null;
  created_at: string;
};

type Checkout = {
  id: string;
  status?: string | null;
  billing_mode?: string | null;
  failure_code?: string | null;
  created_at: string;
};

type Subscriber = {
  id: string;
  product: Product;
  organization: {
    id: string;
    name: string;
    slug: string;
    status: string;
    created_at: string;
  };
  owner: Person;
  members: Array<{
    id: string;
    role: string;
    status: string;
    created_at: string;
    user: Person;
  }>;
  customer_since: string;
  account_age_days: number;
  access: {
    status: string;
    provider_status?: string | null;
    billing_mode?: string | null;
    provider?: string | null;
    trial_ends_at?: string | null;
    current_period_end?: string | null;
    access_expires_at?: string | null;
    cancel_at_period_end?: boolean;
    lifetime_access?: boolean;
  };
  plan: { code?: string | null; name: string; price_cents?: number | null };
  usage: {
    primary: number;
    primary_label: string;
    secondary: number;
    secondary_label: string;
    last_activity_at?: string | null;
    limit?: number | null;
  };
  invoices: Invoice[];
  checkouts: Checkout[];
};

type ConsoleData = {
  rows: Subscriber[];
  summary: {
    issuer: number;
    extractor: number;
    active: number;
    overdue: number;
    hidden_test_accounts: number;
  };
  generated_at: string;
};

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const shortDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const integer = new Intl.NumberFormat("pt-BR");

async function invokeConsole<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-subscriber-console", { body });
  if (!error && !data?.error) return data as T;
  let message = data?.error || error?.message || "Falha no painel de assinantes.";
  try {
    const context = (error as { context?: Response })?.context;
    if (context) {
      const payload = await context.clone().json();
      message = payload?.error || message;
    }
  } catch {
    // Keep the original message.
  }
  throw new Error(message);
}

const statusLabel = (value?: string | null) => {
  const labels: Record<string, string> = {
    active: "Ativo",
    trialing: "Em teste",
    past_due: "Pagamento pendente",
    overdue: "Em atraso",
    incomplete: "Cadastro incompleto",
    canceled: "Cancelado",
    suspended: "Suspenso",
    disabled: "Desativado",
  };
  return labels[String(value || "").toLowerCase()] || value || "Não informado";
};

const statusTone = (value?: string | null) => {
  const normalized = String(value || "").toLowerCase();
  if (["active", "trialing"].includes(normalized)) return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300";
  if (["past_due", "overdue", "incomplete"].includes(normalized)) return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300";
  return "border-border bg-muted/40 text-muted-foreground";
};

const formatDateTime = (value?: string | null) => value ? dateTime.format(new Date(value)) : "Nunca";
const formatDate = (value?: string | null) => value ? shortDate.format(new Date(value)) : "—";
const initials = (value?: string | null) =>
  String(value || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join("") || "?";

export default function AdminSubscribers() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [data, setData] = useState<ConsoleData | null>(null);
  const [product, setProduct] = useState<Product>("issuer");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Subscriber | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const bootstrap = await invokeConsole<{ configured: boolean }>({ action: "bootstrap" });
        if (active) setConfigured(bootstrap.configured);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Não foi possível abrir a área protegida.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const loadData = useCallback(async (consoleToken: string, silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const next = await invokeConsole<ConsoleData>({ action: "data", console_token: consoleToken });
      setData(next);
      if (selected) {
        setSelected(next.rows.find(row => row.id === selected.id) || null);
      }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Não foi possível carregar os assinantes.";
      setError(message);
      if (/expirada/i.test(message)) {
        setToken("");
        setData(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selected?.id]);

  const authenticate = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (configured === false && password !== confirmation) throw new Error("As senhas não coincidem.");
      const result = await invokeConsole<{ token: string }>({
        action: configured ? "unlock" : "set_password",
        password,
      });
      setToken(result.token);
      setConfigured(true);
      setPassword("");
      setConfirmation("");
      await loadData(result.token);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível desbloquear.");
    } finally {
      setLoading(false);
    }
  };

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (data?.rows || []).filter(row => {
      if (row.product !== product) return false;
      if (!normalized) return true;
      const members = row.members.flatMap(member => [member.user.name, member.user.email]);
      return [
        row.organization.name,
        row.organization.slug,
        row.owner.name,
        row.owner.email,
        row.plan.name,
        ...members,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [data?.rows, product, query]);

  const lock = () => {
    setToken("");
    setData(null);
    setSelected(null);
    setError("");
  };

  return (
    <AdminLayout>
      <AdminPage className="ws-admin-polish">
        {!token ? (
          <section className="mx-auto mt-12 max-w-md rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="mt-6 flex items-center gap-2">
              <h1 className="text-xl font-semibold">
                {configured === false ? "Criar senha dos assinantes" : "Área protegida"}
              </h1>
              <LockKeyhole className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {configured === false
                ? "Defina uma senha exclusiva para consultar usuários, faturamento, uso e dados de acesso dos SaaS."
                : "Informe a senha exclusiva para abrir a administração de assinantes do Emissor e do Extrator."}
            </p>
            <form className="mt-7 space-y-4" onSubmit={authenticate}>
              <label className="block space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Senha</span>
                <Input
                  type="password"
                  minLength={8}
                  autoComplete={configured === false ? "new-password" : "current-password"}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  required
                />
              </label>
              {configured === false && (
                <label className="block space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Confirmar senha</span>
                  <Input
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={event => setConfirmation(event.target.value)}
                    required
                  />
                </label>
              )}
              {error && (
                <p className="flex gap-2 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}
              <Button className="w-full" type="submit" disabled={loading || configured === null}>
                {loading ? "Verificando..." : configured === false ? "Criar senha e acessar" : "Desbloquear"}
              </Button>
            </form>
          </section>
        ) : (
          <div className="space-y-6">
            <AdminPageHeader
              eyebrow="Clientes"
              title="Assinantes dos SaaS"
              description="Acompanhe separadamente os assinantes do Emissor Fiscal e do Extrator Fiscal, com uso, acesso, faturamento e atividade de cada conta."
              actions={
                <>
                  <Button variant="outline" onClick={() => void loadData(token, true)} disabled={refreshing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    Atualizar
                  </Button>
                  <Button variant="ghost" onClick={lock}>
                    <LockKeyhole className="mr-2 h-4 w-4" />
                    Bloquear
                  </Button>
                </>
              }
            />

            <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
              <button
                type="button"
                onClick={() => setProduct("issuer")}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                  product === "issuer" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Emissor Fiscal
              </button>
              <button
                type="button"
                onClick={() => setProduct("extractor")}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                  product === "extractor" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Extrator Fiscal
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Emissor Fiscal" value={integer.format(data?.summary.issuer || 0)} detail="contas visíveis" icon={ReceiptText} />
              <Metric label="Extrator Fiscal" value={integer.format(data?.summary.extractor || 0)} detail="contas visíveis" icon={PackageCheck} />
              <Metric label="Acessos ativos" value={integer.format(data?.summary.active || 0)} detail="ativos ou em teste" icon={ShieldCheck} />
              <Metric label="Contas de teste" value={integer.format(data?.summary.hidden_test_accounts || 0)} detail="ocultas desta visão" icon={UsersRound} />
            </div>

            <AdminSection>
              <div className="flex flex-col gap-3 border-b border-border/50 bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold">
                    {product === "issuer" ? "Assinantes do Emissor Fiscal" : "Assinantes do Extrator Fiscal"}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Clique em uma conta para abrir uso, faturas, membros e atividade.
                  </p>
                </div>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder="Buscar nome, e-mail ou plano..."
                  />
                </div>
              </div>

              {loading && !data ? (
                <AdminLoadingState label="Carregando assinantes..." />
              ) : visible.length === 0 ? (
                <AdminEmptyState
                  icon={<UsersRound className="h-5 w-5" />}
                  title="Nenhum assinante encontrado"
                  description="A lista mostra apenas contas comerciais; workspaces internos e contas persistentes de teste ficam fora desta visão."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1040px] text-left">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/20 text-[10px] uppercase tracking-[.12em] text-muted-foreground">
                        <th className="px-5 py-3 font-semibold">Assinante</th>
                        <th className="px-4 py-3 font-semibold">Plano e acesso</th>
                        <th className="px-4 py-3 font-semibold">Uso</th>
                        <th className="px-4 py-3 font-semibold">Último login</th>
                        <th className="px-4 py-3 font-semibold">Cliente desde</th>
                        <th className="w-12 px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map(row => (
                        <tr
                          key={row.id}
                          tabIndex={0}
                          role="button"
                          onClick={() => setSelected(row)}
                          onKeyDown={event => {
                            if (event.key === "Enter") setSelected(row);
                          }}
                          className="cursor-pointer border-b border-border/45 transition last:border-b-0 hover:bg-muted/20"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/35 text-xs font-semibold">
                                {initials(row.owner.name || row.organization.name)}
                              </span>
                              <span className="min-w-0">
                                <strong className="block max-w-[260px] truncate text-sm">
                                  {row.owner.name || row.organization.name}
                                </strong>
                                <span className="mt-0.5 block max-w-[280px] truncate text-xs text-muted-foreground">
                                  {row.owner.email || row.organization.name}
                                </span>
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p className="max-w-[220px] truncate text-sm font-medium">{row.plan.name}</p>
                            <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusTone(row.access.status)}`}>
                              {statusLabel(row.access.status)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-semibold tabular-nums">{integer.format(row.usage.primary)}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{row.usage.primary_label}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm">{formatDateTime(row.owner.last_login_at)}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {row.owner.last_login_at ? "atividade da conta" : "sem login registrado"}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm">{formatDate(row.customer_since)}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {integer.format(row.account_age_days)} dias
                            </p>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminSection>

            {data?.generated_at && (
              <p className="text-right text-[11px] text-muted-foreground">
                Dados atualizados em {formatDateTime(data.generated_at)}
              </p>
            )}
          </div>
        )}

        {selected && (
          <SubscriberDrawer subscriber={selected} onClose={() => setSelected(null)} />
        )}
      </AdminPage>
    </AdminLayout>
  );
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof ReceiptText;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function SubscriberDrawer({ subscriber, onClose }: { subscriber: Subscriber; onClose: () => void }) {
  const invoiceTotal = subscriber.invoices.reduce((sum, invoice) => sum + Number(invoice.total_cents || 0), 0);

  return (
    <div
      className="fixed inset-0 z-[160] flex justify-end bg-black/45"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-card/95 px-6 py-5 backdrop-blur">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">
              {subscriber.product === "issuer" ? "Emissor Fiscal" : "Extrator Fiscal"}
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold">
              {subscriber.owner.name || subscriber.organization.name}
            </h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {subscriber.owner.email || subscriber.organization.name}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6 p-6">
          <section className="grid gap-3 sm:grid-cols-2">
            <InfoCard label="Organização" value={subscriber.organization.name} />
            <InfoCard label="Plano" value={subscriber.plan.name} />
            <InfoCard label="Status" value={statusLabel(subscriber.access.status)} />
            <InfoCard label="Último login" value={formatDateTime(subscriber.owner.last_login_at)} />
            <InfoCard label="Cliente desde" value={formatDate(subscriber.customer_since)} />
            <InfoCard label="Tempo de uso" value={`${integer.format(subscriber.account_age_days)} dias`} />
          </section>

          <section className="rounded-2xl border border-border/60 p-5">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Uso do produto</h3>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-2xl font-semibold tabular-nums">{integer.format(subscriber.usage.primary)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{subscriber.usage.primary_label}</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{integer.format(subscriber.usage.secondary)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{subscriber.usage.secondary_label}</p>
              </div>
            </div>
            {subscriber.usage.limit ? (
              <div className="mt-5 border-t border-border/50 pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Limite mensal</span>
                  <strong>{integer.format(subscriber.usage.limit)}</strong>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-foreground"
                    style={{ width: `${Math.min(100, (subscriber.usage.primary / subscriber.usage.limit) * 100)}%` }}
                  />
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-border/60">
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Faturas</h3>
              </div>
              <span className="text-xs text-muted-foreground">
                {subscriber.invoices.length} registro(s) · {money.format(invoiceTotal / 100)}
              </span>
            </div>
            {subscriber.invoices.length ? (
              <div className="divide-y divide-border/45">
                {subscriber.invoices.slice(0, 10).map(invoice => (
                  <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                      <p className="text-sm font-medium">
                        {invoice.description || (invoice.invoice_number ? `Fatura #${invoice.invoice_number}` : "Fatura")}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Vencimento {formatDate(invoice.due_date)} · {invoice.payment_method || "método não informado"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{money.format(Number(invoice.total_cents || 0) / 100)}</p>
                      <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusTone(invoice.status)}`}>
                        {statusLabel(invoice.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhuma fatura registrada.</p>
            )}
          </section>

          <section className="rounded-2xl border border-border/60">
            <div className="flex items-center gap-2 border-b border-border/50 px-5 py-4">
              <UsersRound className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Usuários da organização</h3>
            </div>
            <div className="divide-y divide-border/45">
              {subscriber.members.map(member => (
                <div key={member.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{member.user.name || "Usuário"}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{member.user.email || member.user.id}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium">{member.role}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatDateTime(member.user.last_login_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <InfoLine icon={Mail} label="E-mail" value={subscriber.owner.email || "Não informado"} />
            <InfoLine icon={CalendarDays} label="Conta criada" value={formatDateTime(subscriber.owner.created_at)} />
            <InfoLine icon={Clock3} label="Último login" value={formatDateTime(subscriber.owner.last_login_at)} />
            <InfoLine icon={ShieldCheck} label="Acesso" value={statusLabel(subscriber.access.status)} />
          </section>

          {subscriber.checkouts.length ? (
            <section className="rounded-2xl border border-border/60 p-5">
              <h3 className="font-semibold">Histórico de checkout</h3>
              <div className="mt-4 space-y-3">
                {subscriber.checkouts.slice(0, 6).map(checkout => (
                  <div key={checkout.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{formatDateTime(checkout.created_at)}</span>
                    <span className="font-medium">{statusLabel(checkout.status)}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/55 bg-muted/10 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-sm font-medium">{value}</p>
    </div>
  );
}

function InfoLine({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-border/55 p-4">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 break-words text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
