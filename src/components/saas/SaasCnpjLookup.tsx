import { useRef, useState } from 'react';
import { Building2, CheckCircle2, Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const onlyDigits = (value: any) => String(value || '').replace(/\D/g, '').slice(0, 14);
export const formatCnpjLookup = (value: any) => {
  const d = onlyDigits(value);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
};

export async function lookupCnpjData(organizationId: string, cnpj: string) {
  const { data, error } = await supabase.functions.invoke('saas-registry-lookup', {
    body: { organization_id: organizationId, cnpj: onlyDigits(cnpj) },
  });
  if (error || data?.error) throw new Error(data?.error || error?.message || 'Não foi possível consultar o CNPJ.');
  return data;
}

type Props = {
  organizationId: string | null;
  value: string;
  onChange: (cnpj: string) => void;
  onResolved: (data: any, meta: any) => void;
  mode?: 'party' | 'company';
  disabled?: boolean;
};

export default function SaasCnpjLookup({
  organizationId,
  value,
  onChange,
  onResolved,
  mode = 'party',
  disabled = false,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const lastLooked = useRef(onlyDigits(value));

  const run = async (force = false) => {
    const cnpj = onlyDigits(value);
    if (!organizationId || cnpj.length !== 14 || busy || disabled) return;
    if (!force && lastLooked.current === cnpj) return;
    setBusy(true);
    setMessage('Consultando Receita e dados estaduais...');
    setSuccess(false);
    try {
      const result = await lookupCnpjData(organizationId, cnpj);
      lastLooked.current = cnpj;
      onResolved(result.data || {}, result);
      setSuccess(true);
      setMessage(
        result.state_registry_found
          ? `Dados preenchidos automaticamente · IE ${result.data?.state_registration || ''}`
          : 'Dados cadastrais preenchidos. A IE não foi localizada automaticamente nesta consulta.'
      );
    } catch (error: any) {
      setMessage(error?.message || 'Não foi possível consultar o CNPJ.');
      setSuccess(false);
    } finally {
      setBusy(false);
    }
  };

  const companyMode = mode === 'company';
  return (
    <section className="overflow-hidden rounded-xl border border-[#9eabb8] bg-[#e4e8ec] shadow-[0_1px_2px_rgba(15,23,42,.05)]">
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <div className="mb-3 flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#bcc6cf] bg-[#d5dbe1] text-[#344054]">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[.12em] text-[#667085]">
                {companyMode ? 'Etapa 2 · identificação automática' : 'Preenchimento automático'}
              </p>
              <h3 className="mt-0.5 text-sm font-semibold text-[#17233b]">
                {companyMode ? 'CNPJ identificado pelo certificado A1' : 'Comece pelo CNPJ'}
              </h3>
              <p className="mt-1 max-w-3xl text-[11px] leading-5 text-[#667085]">
                {companyMode
                  ? 'O A1 identifica o CNPJ. A partir dele buscamos razão social, endereço, CNAE, contato e dados estaduais como a inscrição estadual.'
                  : 'Digite somente o CNPJ. O sistema busca razão social, nome fantasia, endereço, CNAE, contato e tenta completar a inscrição estadual automaticamente.'}
              </p>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.08em] text-[#475467]">CNPJ</span>
            <div className="relative">
              <input
                value={formatCnpjLookup(value)}
                disabled={disabled}
                onChange={event => {
                  const next = onlyDigits(event.target.value);
                  onChange(next);
                  setSuccess(false);
                  setMessage('');
                }}
                onBlur={() => void run(false)}
                inputMode="numeric"
                autoComplete="off"
                placeholder="00.000.000/0000-00"
                className="h-12 w-full rounded-lg border border-[#9eabb8] bg-[#f4f6f7] px-4 pr-11 text-[16px] font-semibold tracking-[.02em] text-[#17233b] outline-none transition focus:border-[#596579] focus:bg-white focus:ring-4 focus:ring-[#596579]/10 disabled:cursor-not-allowed disabled:opacity-70"
              />
              {success ? (
                <CheckCircle2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#2f7d57]" />
              ) : (
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8698]" />
              )}
            </div>
          </label>
        </div>

        <button
          type="button"
          disabled={disabled || busy || onlyDigits(value).length !== 14}
          onClick={() => void run(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#263241] bg-[#263241] px-4 text-xs font-semibold text-white transition hover:bg-[#344054] disabled:cursor-not-allowed disabled:border-[#b9c1c9] disabled:bg-[#c8cfd6]"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {busy ? 'Buscando...' : success ? 'Atualizar dados' : 'Preencher automaticamente'}
        </button>
      </div>

      <div className="border-t border-[#c3cbd3] bg-[#dce1e6] px-4 py-2.5 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] text-[#667085]">
          <span><b className="font-semibold text-[#344054]">1.</b> CNPJ e Receita</span>
          <span><b className="font-semibold text-[#344054]">2.</b> Endereço e CNAE</span>
          <span><b className="font-semibold text-[#344054]">3.</b> IE e cadastro estadual</span>
          {message && <span className={`ml-auto font-medium ${success ? 'text-[#2f6145]' : busy ? 'text-[#536077]' : 'text-[#8f3d3d]'}`}>{message}</span>}
        </div>
      </div>
    </section>
  );
}
