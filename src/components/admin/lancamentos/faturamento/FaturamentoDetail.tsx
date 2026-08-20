import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AdminDocumentUploadArea } from '../AdminDocumentUploadArea';
import { LancamentosTable, type PlanoContasMap } from '../LancamentosTable';
import { fetchPlanoContas } from '@/lib/planoContas';
import { formatCompetencia } from '@/lib/competencia';

interface FaturamentoDetailProps {
  clientId: string;
  clientName: string;
  competencia: string;
}

interface FaturamentoDocument {
  id: string;
  nome_arquivo: string;
  status_processamento: string | null;
  status_alinhamento: string | null;
  ultimo_erro: string | null;
  created_at: string | null;
}

interface FaturamentoEntry {
  id: string;
  data: string | null;
  historico: string | null;
  debito: string | null;
  credito: string | null;
  valor: number | null;
  centro_custo_debito: string | null;
  centro_custo_credito: string | null;
  created_at: string;
}

const documentStatus = (document: FaturamentoDocument) => {
  if (document.status_processamento === 'erro' || document.status_alinhamento === 'erro') {
    return { label: 'Erro', variant: 'destructive' as const, icon: AlertCircle };
  }
  if (
    document.status_processamento === 'processando' ||
    document.status_alinhamento === 'processando' ||
    document.status_alinhamento === 'aguardando_retry'
  ) {
    return { label: 'Processando', variant: 'secondary' as const, icon: Loader2 };
  }
  if (document.status_alinhamento === 'concluido') {
    return { label: 'Classificado', variant: 'outline' as const, icon: CheckCircle2 };
  }
  return { label: 'Recebido', variant: 'outline' as const, icon: FileText };
};

export const FaturamentoDetail = ({
  clientId,
  clientName,
  competencia,
}: FaturamentoDetailProps) => {
  const [documents, setDocuments] = useState<FaturamentoDocument[]>([]);
  const [entries, setEntries] = useState<FaturamentoEntry[]>([]);
  const [planoContas, setPlanoContas] = useState<PlanoContasMap>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ data: docs, error: docsError }, plan] = await Promise.all([
        supabase
          .from('documentos_brutos')
          .select(
            'id, nome_arquivo, status_processamento, status_alinhamento, ultimo_erro, created_at'
          )
          .eq('user_id', clientId)
          .eq('competencia', competencia)
          .eq('tipo_documento', 'faturamento')
          .order('created_at', { ascending: false }),
        fetchPlanoContas(clientId),
      ]);
      if (docsError) throw docsError;
      const nextDocuments = docs || [];
      setDocuments(nextDocuments);
      setPlanoContas(plan.map);

      if (nextDocuments.length === 0) {
        setEntries([]);
        return;
      }

      const { data: aligned, error: alignedError } = await supabase
        .from('lancamentos_alinhados')
        .select('*')
        .eq('user_id', clientId)
        .eq('competencia', competencia)
        .in(
          'documento_origem_id',
          nextDocuments.map(document => document.id)
        )
        .order('data', { ascending: true });
      if (alignedError) throw alignedError;
      setEntries(
        (aligned || []).map(entry => ({
          ...entry,
          created_at: entry.created_at || new Date().toISOString(),
        }))
      );
    } catch (error) {
      console.error('Erro ao carregar faturamento:', error);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, competencia]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-5">
      <section className="border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Faturamento · {formatCompetencia(competencia)}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">Documentos de receita e PGDAS</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              O sistema separa prestação de serviços, revenda de mercadorias e apuração do Simples
              Nacional antes da conferência.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
          {[
            ['Prestação de serviços', 'D · Clientes / C · Receita de serviços'],
            ['Revenda de mercadorias', 'D · Clientes / C · Receita de revenda'],
            ['Apuração PGDAS', 'D · Despesa Simples / C · Simples a pagar'],
          ].map(([title, description], index) => (
            <div key={title} className="p-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Regra {String(index + 1).padStart(2, '0')}
              </p>
              <p className="mt-1.5 text-sm font-medium text-foreground">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-border bg-card p-5">
        <AdminDocumentUploadArea
          clientId={clientId}
          clientName={clientName}
          competencia={competencia}
          monthLabel={formatCompetencia(competencia)}
          documentType="faturamento"
          onUploadComplete={fetchData}
        />
      </section>

      {documents.length > 0 && (
        <section className="border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground">Documentos da competência</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Acompanhe o processamento antes de revisar os lançamentos.
            </p>
          </div>
          <div className="divide-y divide-border">
            {documents.map(document => {
              const status = documentStatus(document);
              const StatusIcon = status.icon;
              return (
                <div key={document.id} className="flex items-center gap-3 px-5 py-3.5">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {document.nome_arquivo}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {document.ultimo_erro || 'Arquivo recebido para classificação'}
                    </p>
                  </div>
                  <Badge variant={status.variant} className="gap-1.5">
                    <StatusIcon
                      className={`h-3 w-3 ${status.label === 'Processando' ? 'animate-spin' : ''}`}
                    />
                    {status.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="border border-border bg-card p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Lançamentos classificados</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Confira o C.R., a descrição das contas, o histórico e o valor antes de concluir.
          </p>
        </div>
        <LancamentosTable
          lancamentos={entries}
          planoContas={planoContas}
          viewMode="data"
          isLoading={isLoading}
        />
      </section>
    </div>
  );
};
