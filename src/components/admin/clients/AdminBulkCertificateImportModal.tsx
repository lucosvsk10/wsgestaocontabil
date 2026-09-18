import { useMemo, useState } from 'react';
import { CheckCircle2, FileKey2, Loader2, Upload, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

type RowStatus = 'ready' | 'processing' | 'imported' | 'existing' | 'error';

type Row = {
  id: string;
  file: File;
  status: RowStatus;
  message: string;
  companyName?: string;
  cnpj?: string;
};

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

async function functionErrorMessage(error: unknown) {
  const fallback = error instanceof Error ? error.message : String(error || 'Erro inesperado');
  try {
    const context = (error as { context?: Response })?.context;
    if (!context) return fallback;
    const payload = await context.clone().json();
    return payload?.error || fallback;
  } catch {
    return fallback;
  }
}

export default function AdminBulkCertificateImportModal({
  open,
  onOpenChange,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => Promise<void> | void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [preferredPassword, setPreferredPassword] = useState('12345678');
  const [running, setRunning] = useState(false);

  const summary = useMemo(() => ({
    imported: rows.filter(row => row.status === 'imported').length,
    existing: rows.filter(row => row.status === 'existing').length,
    failed: rows.filter(row => row.status === 'error').length,
  }), [rows]);

  const selectFiles = (files: FileList | null) => {
    const next = Array.from(files || [])
      .filter(file => /\.(pfx|p12)$/i.test(file.name))
      .map(file => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        status: 'ready' as RowStatus,
        message: 'Pronto para importar',
      }));
    setRows(next);
  };

  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  };

  const importAll = async () => {
    if (running || !rows.length) return;
    setRunning(true);

    for (const row of rows) {
      if (row.status === 'imported' || row.status === 'existing') continue;
      updateRow(row.id, { status: 'processing', message: 'Identificando certificado...' });
      try {
        const certificateBase64 = await fileToBase64(row.file);
        const { data, error } = await supabase.functions.invoke('admin-certificate-batch-import', {
          body: {
            file_name: row.file.name,
            certificate_base64: certificateBase64,
            preferred_password: preferredPassword,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const existing = data?.status === 'already_exists' || data?.status === 'skipped_active_certificate';
        updateRow(row.id, {
          status: existing ? 'existing' : 'imported',
          message: existing
            ? 'A1 já cadastrado — mantido sem alteração'
            : data?.company_created
              ? 'Empresa criada e A1 vinculado'
              : 'A1 vinculado ao cadastro existente',
          companyName: data?.company_name || undefined,
          cnpj: data?.cnpj || undefined,
        });
      } catch (error) {
        updateRow(row.id, {
          status: 'error',
          message: await functionErrorMessage(error),
        });
      }
    }

    setRunning(false);
    await onCompleted();
  };

  const close = () => {
    if (running) return;
    setRows([]);
    setPreferredPassword('12345678');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={next => next ? onOpenChange(true) : close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogTitle>Importar certificados A1 em massa</DialogTitle>
        <DialogDescription>
          Selecione vários arquivos .pfx/.p12 de uma só vez. O sistema identifica o CNPJ, procura o cliente e vincula o A1 sem duplicar empresas ou certificados já ativos.
        </DialogDescription>

        <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_220px]">
          <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/10 px-6 text-center transition hover:bg-muted/25">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <strong className="mt-3 text-sm">Selecionar vários certificados</strong>
            <span className="mt-1 text-xs text-muted-foreground">Você pode marcar todos os .pfx/.p12 da pasta de uma vez.</span>
            <input
              type="file"
              className="hidden"
              multiple
              accept=".pfx,.p12,application/x-pkcs12"
              disabled={running}
              onChange={event => {
                selectFiles(event.target.files);
                event.currentTarget.value = '';
              }}
            />
          </label>

          <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
            <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
              Senha principal
            </span>
            <Input
              className="mt-2"
              type="password"
              value={preferredPassword}
              disabled={running}
              onChange={event => setPreferredPassword(event.target.value)}
            />
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              O sistema também tenta automaticamente as alternativas configuradas para o escritório e o CNPJ presente no nome do arquivo.
            </p>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-border/60">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/15 px-4 py-3">
              <span className="text-xs font-semibold">{rows.length} certificado(s)</span>
              <span className="text-[11px] text-muted-foreground">
                {summary.imported} importado(s) · {summary.existing} já existente(s) · {summary.failed} erro(s)
              </span>
            </div>
            <div className="max-h-[42vh] divide-y divide-border/50 overflow-y-auto">
              {rows.map(row => (
                <div key={row.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted/35">
                    {row.status === 'processing' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : row.status === 'imported' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : row.status === 'existing' ? (
                      <FileKey2 className="h-4 w-4 text-muted-foreground" />
                    ) : row.status === 'error' ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <FileKey2 className="h-4 w-4 text-muted-foreground" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{row.companyName || row.file.name}</p>
                    {row.cnpj && <p className="mt-0.5 text-[10px] text-muted-foreground">{row.cnpj}</p>}
                    <p className={`mt-1 text-[11px] ${row.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {row.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
          <Button variant="ghost" disabled={running} onClick={close}>Fechar</Button>
          <Button disabled={running || !rows.length} onClick={() => void importAll()}>
            {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {running ? 'Importando...' : 'Importar todos'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
