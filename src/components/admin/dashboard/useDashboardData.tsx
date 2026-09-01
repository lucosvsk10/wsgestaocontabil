import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStorageStats } from '@/hooks/useStorageStats';

type DashboardDocument = {
  id: string;
  name: string;
  user_id: string;
  company_id?: string | null;
  uploaded_at: string;
  viewed: boolean | null;
  viewed_at: string | null;
  userName: string;
};

type FiscalSearchRow = {
  companyId: string;
  companyName: string;
  lastSearchAt: string | null;
  status: 'ok' | 'running' | 'attention' | 'idle';
  direction: 'Compras e vendas' | 'Compras' | 'Vendas' | 'Sem buscas';
};

interface DashboardStats {
  totalUsers: number;
  totalDocuments: number;
  recentDocuments: DashboardDocument[];
  viewedDocuments: DashboardDocument[];
  viewedCount: number;
  unviewedCount: number;
  viewRate: number;
  last14Days: Array<{ day: string; sent: number; viewed: number }>;
  last30Days: Array<{ date: string; label: string; activity: number }>;
  topClients: Array<{ name: string; viewed: number; sent: number }>;
  fiscalSearches: FiscalSearchRow[];
  storageStats: {
    totalStorageMB: number;
    totalStorageGB: number;
    storageLimitGB: number;
  } | null;
}

const initialStats: DashboardStats = {
  totalUsers: 0,
  totalDocuments: 0,
  recentDocuments: [],
  viewedDocuments: [],
  viewedCount: 0,
  unviewedCount: 0,
  viewRate: 0,
  last14Days: [],
  last30Days: [],
  topClients: [],
  fiscalSearches: [],
  storageStats: null,
};

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const dateKey = (date: Date | string) => {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
};

export const useDashboardData = () => {
  const { storageStats } = useStorageStats();
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loading, setLoading] = useState(true);

  const formatRecentDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Sem registro';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - date.getTime());
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMinutes < 1) return 'Agora';
    if (diffMinutes < 60) return `${diffMinutes} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  useEffect(() => {
    if (!storageStats) return;
    setStats(prev => ({
      ...prev,
      storageStats: {
        totalStorageMB: Number((storageStats.totalStorageMB || 0).toFixed(2)),
        totalStorageGB: Number((storageStats.totalStorageGB || 0).toFixed(2)),
        storageLimitGB: storageStats.storageLimitGB || 100,
      },
    }));
  }, [storageStats]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const [usersResult, documentsCountResult, documentsResult, companiesResult, fiscalCompaniesResult, salesResult, purchaseResult] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('documents').select('*', { count: 'exact', head: true }).or('status.eq.active,status.is.null'),
        supabase.from('documents').select('id,name,user_id,company_id,uploaded_at,viewed,viewed_at,users(name)').gte('uploaded_at', ninetyDaysAgo.toISOString()).or('status.eq.active,status.is.null').order('uploaded_at', { ascending: false }).limit(800),
        (supabase as any).from('companies').select('id,company_name,trade_name'),
        (supabase as any).from('fiscal_companies').select('id,company_id'),
        (supabase as any).from('fiscal_sales_sync_state').select('company_id,status,last_completed_at,last_started_at,last_failed_at'),
        (supabase as any).from('fiscal_purchase_sync_state').select('company_id,status,last_completed_at,last_started_at,last_failed_at'),
      ]);

      const docs: DashboardDocument[] = ((documentsResult.data || []) as any[]).map(doc => ({
        id: doc.id,
        name: doc.name,
        user_id: doc.user_id,
        company_id: doc.company_id,
        uploaded_at: doc.uploaded_at,
        viewed: doc.viewed,
        viewed_at: doc.viewed_at,
        userName: doc.users?.name || 'Cliente sem nome',
      }));

      const viewedCount = docs.filter(doc => Boolean(doc.viewed || doc.viewed_at)).length;
      const unviewedCount = docs.length - viewedCount;
      const viewRate = docs.length ? Math.round((viewedCount / docs.length) * 100) : 0;

      const last14Days = Array.from({ length: 14 }, (_, index) => {
        const date = startOfDay(new Date());
        date.setDate(date.getDate() - (13 - index));
        const key = dateKey(date);
        return {
          key,
          day: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', ''),
          sent: docs.filter(doc => dateKey(doc.uploaded_at) === key).length,
          viewed: docs.filter(doc => doc.viewed_at && dateKey(doc.viewed_at) === key).length,
        };
      }).map(({ day, sent, viewed }) => ({ day, sent, viewed }));

      const last30Days = Array.from({ length: 30 }, (_, index) => {
        const date = startOfDay(new Date());
        date.setDate(date.getDate() - (29 - index));
        const key = dateKey(date);
        const sent = docs.filter(doc => dateKey(doc.uploaded_at) === key).length;
        const viewed = docs.filter(doc => doc.viewed_at && dateKey(doc.viewed_at) === key).length;
        return { date: key, label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), activity: sent + viewed };
      });

      const byClient = new Map<string, { name: string; viewed: number; sent: number }>();
      docs.forEach(doc => {
        const key = doc.user_id || doc.userName;
        const current = byClient.get(key) || { name: doc.userName, viewed: 0, sent: 0 };
        current.sent += 1;
        if (doc.viewed || doc.viewed_at) current.viewed += 1;
        byClient.set(key, current);
      });
      const topClients = [...byClient.values()].sort((a, b) => b.viewed - a.viewed || b.sent - a.sent).slice(0, 6);

      const companies = ((companiesResult.data || []) as any[]);
      const fiscalCompanies = ((fiscalCompaniesResult.data || []) as any[]);
      const companyByFiscal = new Map(fiscalCompanies.map(item => [item.id, item.company_id]));
      const centralById = new Map(companies.map(company => [company.id, company]));
      const salesByCentral = new Map<string, any>();
      const purchasesByCentral = new Map<string, any>();
      ((salesResult.data || []) as any[]).forEach(row => { const id = companyByFiscal.get(row.company_id); if (id) salesByCentral.set(id, row); });
      ((purchaseResult.data || []) as any[]).forEach(row => { const id = companyByFiscal.get(row.company_id); if (id) purchasesByCentral.set(id, row); });

      const fiscalSearches: FiscalSearchRow[] = companies.map(company => {
        const sales = salesByCentral.get(company.id);
        const purchases = purchasesByCentral.get(company.id);
        const timestamps = [sales?.last_completed_at, purchases?.last_completed_at, sales?.last_started_at, purchases?.last_started_at].filter(Boolean).map(value => new Date(value).getTime());
        const lastSearchAt = timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;
        const states = [sales?.status, purchases?.status].filter(Boolean).map(String);
        const hasFailure = Boolean(sales?.last_failed_at || purchases?.last_failed_at) && states.some(state => /fail|error/i.test(state));
        const running = states.some(state => /running|process|sync/i.test(state));
        const direction: FiscalSearchRow['direction'] = sales && purchases ? 'Compras e vendas' : sales ? 'Vendas' : purchases ? 'Compras' : 'Sem buscas';
        return {
          companyId: company.id,
          companyName: company.trade_name || company.company_name,
          lastSearchAt,
          status: hasFailure ? 'attention' : running ? 'running' : lastSearchAt ? 'ok' : 'idle',
          direction,
        };
      }).filter(item => item.lastSearchAt || item.direction !== 'Sem buscas').sort((a, b) => new Date(b.lastSearchAt || 0).getTime() - new Date(a.lastSearchAt || 0).getTime());

      setStats(prev => ({
        ...prev,
        totalUsers: usersResult.count || 0,
        totalDocuments: documentsCountResult.count || 0,
        recentDocuments: docs.slice(0, 7),
        viewedDocuments: docs.filter(doc => doc.viewed_at).sort((a, b) => new Date(b.viewed_at || 0).getTime() - new Date(a.viewed_at || 0).getTime()).slice(0, 7),
        viewedCount,
        unviewedCount,
        viewRate,
        last14Days,
        last30Days,
        topClients,
        fiscalSearches,
      }));
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchDashboardData(); }, []);

  return useMemo(() => ({ stats, loading, refetch: fetchDashboardData, formatRecentDate, isLoading: loading }), [stats, loading]);
};
