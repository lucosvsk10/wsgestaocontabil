import { useRef, useState } from 'react';
import { FileKey2, ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { fiscalConfigRequest } from '@/lib/saas/fiscalConfigRequest';
import { formatCnpjLookup } from './SaasCnpjLookup';

type Props = {
  organizationId: string;
  configured: boolean;
  taxId: string;
  subject?: string;
  expiresAt?: string;
  onSaved: () => Promise<void>;
  onBusyChange: (busy: boolean) => void;
};

export default function SaasCertificatePanel({
  organizationId,
  configured,
  taxId,
  subject,
  expiresAt,
  onSaved,
  onBusyChange,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [phase, setPhase] = useState<'idle' | 'reading' | 'saving'>('idle');
  const [feedback, setFeedback] = useState<{
    kind: 'error' | 'success' | 'warning';
    text: string;
  } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const running = useRef(false);
  const busy = phase !== 'idle';
  const expired = Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
  const select = (candidate?: File) => {
    setFeedback(null);
    setFile(null);
    if (!candidate) return;
    if (!/\.(pfx|p12)$/i.test(candidate.name))
      return setFeedback({
        kind: 'error',
        text: 'Selecione um certificado A1 no formato .pfx ou .p12.',
      });
    if (!candidate.size || candidate.size > 5 * 1024 * 1024)
      return setFeedback({ kind: 'error', text: 'O arquivo deve ter conteúdo e no máximo 5 MB.' });
    setFile(candidate);
  };
  const submit = async () => {
    if (running.current) return;
    if (!file || !password) {
      setFeedback({
        kind: 'error',
        text: !file
          ? 'Selecione o arquivo do certificado.'
          : 'Informe a senha do certificado para validar e salvar.',
      });
      return;
    }
    running.current = true;
    onBusyChange(true);
    setFeedback(null);
    setPhase('reading');
    let saved = false;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 8192)
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      setPhase('saving');
      const result = await fiscalConfigRequest({
        action: 'save_certificate',
        organization_id: organizationId,
        certificate_base64: btoa(binary),
        certificate_password: password,
      });
      if (!result.ok || !result.certificate?.expires_at)
        throw new Error(
          'Não foi possível confirmar o salvamento do certificado. Confira o status antes de reenviar.'
        );
      saved = true;
      setPassword('');
      setFile(null);
      if (input.current) input.current.value = '';
      await onSaved();
      setFeedback({
        kind: 'success',
        text: 'Senha validada. Certificado salvo e disponível para esta empresa.',
      });
    } catch (error) {
      setFeedback({
        kind: saved ? 'warning' : 'error',
        text: saved
          ? 'O certificado foi salvo, mas não foi possível atualizar os dados na tela. Recarregue antes de reenviar.'
          : error instanceof Error
            ? error.message
            : 'Não foi possível ler o arquivo. Selecione-o novamente.',
      });
    } finally {
      running.current = false;
      setPhase('idle');
      onBusyChange(false);
    }
  };
  return (
    <section
      className="overflow-hidden rounded-xl border border-slate-300 bg-white"
      aria-labelledby="certificate-title"
      aria-busy={busy}
    >
      <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-5">
        <FileKey2 className="mt-1 h-5 w-5 text-slate-600" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Identidade fiscal
          </p>
          <h3 id="certificate-title" className="mt-1 text-lg font-medium">
            Certificado digital A1
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Escolha o arquivo, informe a senha e confirme o envio.
          </p>
        </div>
      </div>
      <div className="grid lg:grid-cols-[.85fr_1.15fr]">
        <div className="border-b border-slate-200 bg-slate-50 p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4" />
            Certificado salvo{' '}
            <span
              className={`ml-auto rounded-full px-2 py-1 text-xs ${configured && !expired ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}
            >
              {configured ? (expired ? 'Expirado' : 'Configurado') : 'Pendente'}
            </span>
          </div>
          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Empresa vinculada</dt>
              <dd className="mt-1 font-medium">
                {formatCnpjLookup(taxId) || 'A identificar pelo A1'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Titular do certificado</dt>
              <dd className="mt-1">{subject || 'Nenhum certificado salvo'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Validade</dt>
              <dd className="mt-1">
                {expiresAt ? new Date(expiresAt).toLocaleDateString('pt-BR') : '—'}
              </dd>
            </div>
          </dl>
          <p className="mt-6 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
            Você pode renovar o A1 desta empresa. Um certificado de outro CNPJ não substitui a
            empresa atual: use o cadastro da empresa correspondente.
          </p>
        </div>
        <div className="space-y-4 p-5">
          <label className="block text-sm font-medium">
            1. Arquivo do certificado
            <input
              ref={input}
              type="file"
              accept=".pfx,.p12"
              disabled={busy}
              className="mt-2 block w-full min-w-0 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs file:mr-3 file:rounded file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:font-medium"
              onChange={e => {
                select(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          <p className="text-xs text-slate-500">
            {file
              ? `${file.name} · ${Math.max(1, Math.ceil(file.size / 1024))} KB · pronto para validar`
              : 'Formatos .pfx ou .p12 · até 5 MB. Selecionar não envia o arquivo.'}
          </p>
          <label className="block text-sm font-medium">
            2. Senha do certificado
            <input
              type="password"
              autoComplete="off"
              disabled={busy}
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                setFeedback(null);
              }}
              className="mt-2 block h-11 w-full rounded-lg border border-slate-300 px-3 font-normal"
              placeholder="Senha fornecida com o arquivo A1"
            />
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {phase === 'reading'
              ? 'Lendo arquivo…'
              : phase === 'saving'
                ? 'Validando senha e salvando…'
                : 'Validar e salvar certificado'}
          </button>
          {busy && (
            <p role="status" className="text-xs text-slate-500">
              Aguarde a confirmação antes de sair desta tela.
            </p>
          )}
          {feedback && (
            <div
              role={feedback.kind === 'error' ? 'alert' : 'status'}
              className={`flex items-start gap-2 rounded-lg border p-3 text-sm leading-5 ${feedback.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : feedback.kind === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-900'}`}
            >
              {feedback.kind === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
