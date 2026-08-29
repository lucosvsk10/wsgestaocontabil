import { Activity, ArrowUpRight, CheckCircle2, Circle, Eye, FileText, RefreshCcw, Search, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { AdminPageHeader } from "@/components/admin/ui/AdminPage";
import { useDashboardData } from "./useDashboardData";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface AdminDashboardProps {
  users: any[];
  supabaseUsers: any[];
  documents: any[];
}

const chartColors = {
  sent: 'hsl(var(--foreground) / .72)',
  viewed: 'hsl(var(--foreground) / .28)',
  strong: 'hsl(var(--foreground) / .9)',
  soft: 'hsl(var(--muted-foreground) / .22)',
};

export const AdminDashboard = ({ users, supabaseUsers }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const clientUsers = supabaseUsers.filter(authUser => {
    const userInfo = users.find(user => user.id === authUser.id);
    return !['fiscal', 'contabil', 'geral'].includes(userInfo?.role || '');
  });
  const { stats, formatRecentDate, isLoading, refetch } = useDashboardData();

  if (isLoading) return <div className="flex min-h-[55vh] items-center justify-center"><LoadingSpinner /></div>;

  const readingData = [
    { name: 'Visualizados', value: stats.viewedCount },
    { name: 'Aguardando leitura', value: stats.unviewedCount },
  ];
  const maxActivity = Math.max(1, ...stats.last30Days.map(item => item.activity));

  return (
    <div className="ws-storage-style mx-auto w-full max-w-[1540px] space-y-5 px-4 py-5 sm:px-5 sm:py-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Visão operacional"
        title="Dashboard"
        description="Documentos, leituras e movimentação recente dos clientes em uma única visão."
        actions={<Button variant="outline" onClick={() => void refetch()}><RefreshCcw className="mr-2 h-4 w-4" />Atualizar</Button>}
      />

      <div className="grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
        <Card className="overflow-hidden border-0 bg-card shadow-sm">
          <CardContent className="p-0">
            <div className="flex flex-col justify-between gap-4 border-b border-border/35 px-5 py-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-muted-foreground">Movimento dos últimos 14 dias</p>
                <h2 className="mt-2 text-xl font-medium">Documentos enviados e visualizados</h2>
                <p className="mt-1 text-sm text-muted-foreground">Uma leitura direta do fluxo de entrega dos clientes.</p>
              </div>
              <div className="flex gap-5 text-right">
                <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Clientes</p><p className="mt-1 text-xl font-light">{clientUsers.length}</p></div>
                <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Documentos</p><p className="mt-1 text-xl font-light">{stats.totalDocuments}</p></div>
              </div>
            </div>
            <div className="h-[330px] p-4 sm:p-5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.last14Days} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sentFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chartColors.sent} stopOpacity={0.34}/><stop offset="100%" stopColor={chartColors.sent} stopOpacity={0.02}/></linearGradient>
                    <linearGradient id="viewedFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chartColors.viewed} stopOpacity={0.36}/><stop offset="100%" stopColor={chartColors.viewed} stopOpacity={0.02}/></linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border) / .45)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="sent" name="Enviados" stroke={chartColors.sent} strokeWidth={2.4} fill="url(#sentFill)" />
                  <Area type="monotone" dataKey="viewed" name="Visualizados" stroke={chartColors.viewed} strokeWidth={2.2} fill="url(#viewedFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 bg-card shadow-sm">
          <CardContent className="p-0">
            <div className="border-b border-border/35 px-5 py-5"><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-muted-foreground">Leitura dos documentos</p><h2 className="mt-2 text-xl font-medium">Como os clientes estão respondendo</h2></div>
            <div className="relative h-[250px] px-5 pt-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={readingData} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="88%" paddingAngle={4} stroke="none">{readingData.map((_, index) => <Cell key={index} fill={index === 0 ? chartColors.strong : chartColors.soft} />)}</Pie><Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} /></PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center pt-3"><div className="text-center"><p className="text-4xl font-light tracking-tight">{stats.viewRate}%</p><p className="mt-1 text-[10px] uppercase tracking-[.13em] text-muted-foreground">visualizados</p></div></div>
            </div>
            <div className="grid grid-cols-2 border-t border-border/35">
              <div className="border-r border-border/35 p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" />Visualizados</div><p className="mt-2 text-2xl font-light">{stats.viewedCount}</p></div>
              <div className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Circle className="h-3.5 w-3.5" />Aguardando leitura</div><p className="mt-2 text-2xl font-light">{stats.unviewedCount}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.12fr_.88fr]">
        <Card className="overflow-hidden border-0 bg-card shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border/35 px-5 py-4"><div><h3 className="font-medium">Documentos recentes</h3><p className="text-xs text-muted-foreground">Mantendo o acompanhamento dos últimos envios</p></div><Button size="sm" variant="ghost" onClick={() => navigate('/admin/documentos')}>Abrir documentos<ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Button></div>
            <div>
              {stats.recentDocuments.map((doc, index) => (
                <div key={doc.id} className={`flex items-center gap-4 border-b border-border/25 px-5 py-3.5 last:border-b-0 ${index % 2 ? 'bg-muted/[.07]' : ''}`}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/45"><FileText className="h-4 w-4 text-muted-foreground" /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{doc.name}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{doc.userName} · enviado {formatRecentDate(doc.uploaded_at)}</p></div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${doc.viewed || doc.viewed_at ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted/55 text-muted-foreground'}`}>{doc.viewed || doc.viewed_at ? 'Visualizado' : 'Enviado'}</span>
                </div>
              ))}
              {!stats.recentDocuments.length && <p className="px-5 py-12 text-center text-sm text-muted-foreground">Nenhum documento recente encontrado.</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 bg-card shadow-sm">
          <CardContent className="p-0">
            <div className="border-b border-border/35 px-5 py-4"><h3 className="font-medium">Últimas visualizações</h3><p className="text-xs text-muted-foreground">Quando os clientes realmente abriram os documentos</p></div>
            <div>
              {stats.viewedDocuments.map((doc, index) => (
                <div key={`${doc.id}-view`} className={`relative flex gap-4 border-b border-border/25 px-5 py-3.5 last:border-b-0 ${index % 2 ? 'bg-muted/[.07]' : ''}`}>
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><Eye className="h-3.5 w-3.5" /></div>
                  <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-medium">{doc.userName}</p><span className="shrink-0 text-[10px] text-muted-foreground">{formatRecentDate(doc.viewed_at)}</span></div><p className="mt-1 truncate text-xs text-muted-foreground">visualizou “{doc.name}”</p>{doc.viewed_at && <p className="mt-1 text-[10px] text-muted-foreground/80">{new Date(doc.viewed_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>}</div>
                </div>
              ))}
              {!stats.viewedDocuments.length && <p className="px-5 py-12 text-center text-sm text-muted-foreground">Ainda não há visualizações recentes.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[.82fr_1.18fr]">
        <Card className="overflow-hidden border-0 bg-card shadow-sm">
          <CardContent className="p-0">
            <div className="border-b border-border/35 px-5 py-4"><h3 className="font-medium">Clientes mais ativos</h3><p className="text-xs text-muted-foreground">Documentos visualizados nos últimos 90 dias</p></div>
            <div className="h-[300px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topClients} layout="vertical" margin={{ top: 0, right: 10, left: 8, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="hsl(var(--border) / .38)" />
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis type="category" dataKey="name" width={112} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="viewed" name="Visualizados" fill={chartColors.strong} radius={[0, 7, 7, 0]} barSize={15} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 bg-card shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border/35 px-5 py-4"><div><h3 className="font-medium">Atividade dos últimos 30 dias</h3><p className="text-xs text-muted-foreground">Envios e visualizações formando o ritmo do escritório</p></div><Activity className="h-4 w-4 text-muted-foreground" /></div>
            <div className="p-5">
              <div className="grid grid-cols-10 gap-2 sm:grid-cols-15">
                {stats.last30Days.map(item => {
                  const strength = item.activity / maxActivity;
                  const opacity = item.activity === 0 ? 0.08 : 0.18 + strength * 0.72;
                  return <div key={item.date} title={`${item.label} · ${item.activity} atividade(s)`} className="aspect-square rounded-[6px] border border-border/25" style={{ backgroundColor: `hsl(var(--foreground) / ${opacity})` }} />;
                })}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>Quanto mais intenso, mais movimentação naquele dia.</span><div className="flex items-center gap-1"><span>Menos</span>{[.08,.2,.38,.58,.85].map(level => <span key={level} className="h-3.5 w-3.5 rounded-[4px] border border-border/20" style={{ backgroundColor: `hsl(var(--foreground) / ${level})` }} />)}<span>Mais</span></div></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-0 bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-col justify-between gap-3 border-b border-border/35 px-5 py-4 sm:flex-row sm:items-center"><div><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-muted-foreground">Extração de notas fiscais</p><h3 className="mt-1 font-medium">Últimas buscas</h3><p className="mt-1 text-xs text-muted-foreground">Acompanhe quando cada empresa teve suas notas consultadas pela última vez.</p></div><Button variant="outline" size="sm" onClick={() => navigate('/admin/feature')}><Search className="mr-2 h-3.5 w-3.5" />Ir para notas fiscais</Button></div>
          <div className="divide-y divide-border/25">
            {stats.fiscalSearches.slice(0, 12).map((item, index) => (
              <div key={item.companyId} className={`flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center ${index % 2 ? 'bg-muted/[.06]' : ''}`}>
                <div className="flex min-w-0 flex-1 items-center gap-3"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.status === 'ok' ? 'bg-emerald-500' : item.status === 'running' ? 'bg-sky-500 animate-pulse' : item.status === 'attention' ? 'bg-amber-500' : 'bg-muted-foreground/40'}`} /><div className="min-w-0"><p className="truncate text-sm font-medium">{item.companyName}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.direction}</p></div></div>
                <div className="flex items-center justify-between gap-4 sm:justify-end"><div className="text-right"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Última busca</p><p className="mt-0.5 text-xs font-medium">{item.lastSearchAt ? formatRecentDate(item.lastSearchAt) : 'Ainda não realizada'}</p></div><Button size="sm" variant="ghost" onClick={() => navigate('/admin/feature')}>Ver notas<ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Button></div>
              </div>
            ))}
            {!stats.fiscalSearches.length && <div className="px-5 py-12 text-center"><Users className="mx-auto h-5 w-5 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">Nenhuma busca fiscal registrada ainda.</p></div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
