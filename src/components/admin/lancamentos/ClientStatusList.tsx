import { useCallback, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { PlanoContasModal } from './PlanoContasModal';

interface ClientStatus {
  id: string;
  name: string;
  email: string;
  alignedCount: number;
  closedMonths: number;
  hasPlanoContas: boolean;
}

interface ClientStatusListProps {
  selectedClientId: string | null;
  onSelectClient: (clientId: string) => void;
}

export const ClientStatusList = ({
  selectedClientId,
  onSelectClient,
}: ClientStatusListProps) => {
  const [clients, setClients] = useState<ClientStatus[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [planoOpenFor, setPlanoOpenFor] = useState<{ id: string; name: string } | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      const now = new Date();
      const currentCompetencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const [usersResult, alignedResult, closedResult, planosResult] = await Promise.all([
        supabase.from('users').select('id, name, email').eq('role', 'client'),
        supabase
          .from('lancamentos_alinhados')
          .select('user_id')
          .eq('competencia', currentCompetencia),
        supabase.from('fechamentos_exportados').select('user_id'),
        supabase.from('planos_contas').select('user_id'),
      ]);

      if (usersResult.error) throw usersResult.error;
      if (alignedResult.error) throw alignedResult.error;
      if (closedResult.error) throw closedResult.error;
      if (planosResult.error) throw planosResult.error;

      const alignedByClient = new Map<string, number>();
      const closedByClient = new Map<string, number>();
      const clientsWithPlan = new Set<string>();

      (alignedResult.data || []).forEach(({ user_id }) => {
        alignedByClient.set(user_id, (alignedByClient.get(user_id) || 0) + 1);
      });
      (closedResult.data || []).forEach(({ user_id }) => {
        closedByClient.set(user_id, (closedByClient.get(user_id) || 0) + 1);
      });
      (planosResult.data || []).forEach(({ user_id }) => clientsWithPlan.add(user_id));

      setClients(
        (usersResult.data || []).map(user => ({
          id: user.id,
          name: user.name || 'Sem nome',
          email: user.email || '',
          alignedCount: alignedByClient.get(user.id) || 0,
          closedMonths: closedByClient.get(user.id) || 0,
          hasPlanoContas: clientsWithPlan.has(user.id),
        }))
      );
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredClients = clients.filter(
    client =>
      client.name.toLowerCase().includes(normalizedSearch) ||
      client.email.toLowerCase().includes(normalizedSearch)
  );

  return (
    <div className="flex max-h-[520px] flex-col bg-white dark:bg-[#111214]">
      <div className="shrink-0 border-b border-black/10 p-4 dark:border-white/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Empresas</h2>
          <span className="text-xs text-black/40 dark:text-white/40">{clients.length}</span>
        </div>
        <Input
          placeholder="Buscar por nome ou e-mail"
          value={search}
          onChange={event => setSearch(event.target.value)}
          className="h-10 rounded-none border-black/15 bg-transparent text-sm dark:border-white/15"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-black/45 dark:text-white/40">Carregando...</div>
        ) : filteredClients.length === 0 ? (
          <div className="p-8 text-center text-sm text-black/45 dark:text-white/40">
            Nenhuma empresa encontrada
          </div>
        ) : (
          <div className="divide-y divide-black/10 dark:divide-white/10">
            {filteredClients.map(client => (
              <div
                key={client.id}
                className={
                  selectedClientId === client.id
                    ? 'grid grid-cols-[1fr_auto] bg-black/[0.035] dark:bg-white/[0.05]'
                    : 'grid grid-cols-[1fr_auto] hover:bg-black/[0.02] dark:hover:bg-white/[0.025]'
                }
              >
                <button
                  type="button"
                  onClick={() => onSelectClient(client.id)}
                  className="min-w-0 px-4 py-3 text-left"
                >
                  <p className="truncate text-sm font-medium">{client.name}</p>
                  <p className="mt-0.5 truncate text-xs text-black/45 dark:text-white/40">
                    {client.email}
                  </p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.06em] text-black/40 dark:text-white/35">
                    {client.hasPlanoContas ? 'Plano cadastrado' : 'Plano não cadastrado'}
                    {client.alignedCount > 0 ? ` · ${client.alignedCount} lançamentos` : ''}
                    {client.closedMonths > 0 ? ` · ${client.closedMonths} fechamentos` : ''}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    setPlanoOpenFor({ id: client.id, name: client.name });
                  }}
                  className="border-l border-black/10 px-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-black/45 hover:text-black dark:border-white/10 dark:text-white/40 dark:hover:text-white"
                >
                  Plano
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {planoOpenFor && (
        <PlanoContasModal
          isOpen
          onClose={() => {
            setPlanoOpenFor(null);
            fetchClients();
          }}
          clientId={planoOpenFor.id}
          clientName={planoOpenFor.name}
        />
      )}
    </div>
  );
};
