
import { ChangeEvent, useMemo, useState } from 'react';
import { BadgeCheck, Building2, Check, FileKey2, KeyRound, Loader2, Search, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { lookupOfficeCompanyByCnpj, registryToOfficeCompany } from '@/utils/companyRegistry';

type Method = 'certificate' | 'cnpj' | 'manual';
type DocumentType = 'cnpj' | 'cpf' | 'other';

type CompanyForm = {
  company_name: string;
  trade_name: string;
  document_type: DocumentType;
  document_number: string;
  cnpj: string;
  company_size: string;
  state_registration: string;
  registration_status: string;
  tax_regime: string;
  email: string;
  phone: string;
  postal_code: string;
  street: string;
  street_number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  city_ibge_code: string;
  cnae_primary: string;
  address: string;
  registry_payload: Record<string, unknown>;
};

const DEFAULT_PASSWORD = '5BWasgc1@';

const blankCompany = (): CompanyForm => ({
  company_name: '',
  trade_name: '',
  document_type: 'cnpj',
  document_number: '',
  cnpj: '',
  company_size: '',
  state_registration: '',
  registration_status: '',
  tax_regime: '',
  email: '',
  phone: '',
  postal_code: '',
  street: '',
  street_number: '',
  complement: '',
  district: '',
  city: '',
  state: '',
  city_ibge_code: '',
  cnae_primary: '',
  address: '',
  registry_payload: {},
});

const digits = (value: unknown) => String(value || '').replace(/\D/g, '');
const formatCnpj = (value: unknown) => {
  const d = digits(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return d.slice(0, 2) + '.' + d.slice(2);
  if (d.length <= 8) return d.slice(0, 2) + '.' + d.slice(2, 5) + '.' + d.slice(5);
  if (d.length <= 12) return d.slice(0, 2) + '.' + d.slice(2, 5) + '.' + d.slice(5, 8) + '/' + d.slice(8);
  return d.slice(0, 2) + '.' + d.slice(2, 5) + '.' + d.slice(5, 8) + '/' + d.slice(8, 12) + '-' + d.slice(12);
};
const formatCpf = (value: unknown) => {
  const d = digits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return d.slice(0, 3) + '.' + d.slice(3);
  if (d.length <= 9) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6);
  return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9);
};
const formatCep = (value: unknown) => {
  const d = digits(value).slice(0, 8);
  return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
};

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function invokeOnboarding<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-client-onboarding', { body });
  if (!error && !data?.error) return data as T;
  let message = data?.error || error?.message || 'Não foi possível concluir a operação.';
  try {
    const context = (error as { context?: Response })?.context;
    if (context) {
      const payload = await context.clone().json();
      message = payload?.error || message;
    }
  } catch {}
  throw new Error(message);
}

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  inputMode?: 'text' | 'numeric' | 'email' | 'tel';
  type?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[.08em] text-muted-foreground">
        {props.label}{props.required ? ' *' : ''}
      </span>
      <Input
        type={props.type || 'text'}
        value={props.value}
        disabled={props.disabled}
        inputMode={props.inputMode}
        placeholder={props.placeholder}
        onChange={event => props.onChange(event.target.value)}
        className="h-11"
      />
    </label>
  );
}

function MethodCard(props: {
  active: boolean;
  icon: typeof Building2;
  title: string;
  description: string;
  tag: string;
  onClick: () => void;
}) {
  const Icon = props.icon;
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={'relative overflow-hidden rounded-xl border p-4 text-left transition ' + (
        props.active
          ? 'border-foreground/35 bg-foreground/[.045] shadow-sm'
          : 'border-border/70 bg-card hover:border-foreground/20 hover:bg-muted/20'
      )}
    >
      <div className="relative z-10 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span>
          <span className="block text-sm font-semibold">{props.title}</span>
          <span className="mt-1 block text-[11px] leading-5 text-muted-foreground">{props.description}</span>
          <span className="mt-3 inline-flex rounded-full bg-muted px-2 py-1 text-[9px] font-semibold text-muted-foreground">{props.tag}</span>
        </span>
      </div>
      {props.active && <Check className="absolute right-3 top-3 h-4 w-4 text-foreground" />}
      <Icon className="pointer-events-none absolute -bottom-7 -right-4 h-20 w-20 text-foreground opacity-[.035]" />
    </button>
  );
}

export default function AdminClientOnboardingModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (result: { company_id: string; username: string }) => Promise<void> | void;
}) {
  const [method, setMethod] = useState<Method>('certificate');
  const [company, setCompany] = useState<CompanyForm>(blankCompany());
  const [username, setUsername] = useState('');
  const [certificate, setCertificate] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState('');
  const [certificateMeta, setCertificateMeta] = useState<any>(null);
  const [busyLookup, setBusyLookup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [lookupComplete, setLookupComplete] = useState(false);

  const set = (key: keyof CompanyForm, value: any) => {
    setMessage('');
    setCompany(previous => ({ ...previous, [key]: value }));
  };

  const resetForMethod = (next: Method) => {
    setMethod(next);
    setCompany(blankCompany());
    setCertificate(null);
    setCertificatePassword('');
    setCertificateMeta(null);
    setLookupComplete(false);
    setMessage('');
  };

  const close = () => {
    if (busyLookup || saving) return;
    setMethod('certificate');
    setCompany(blankCompany());
    setUsername('');
    setCertificate(null);
    setCertificatePassword('');
    setCertificateMeta(null);
    setLookupComplete(false);
    setMessage('');
    onClose();
  };

  const applyLookup = (source: any) => {
    setCompany(previous => ({
      ...previous,
      ...source,
      company_name: source.company_name || previous.company_name,
      trade_name: source.trade_name || previous.trade_name,
      document_type: 'cnpj',
      document_number: digits(source.document_number || source.cnpj),
      cnpj: digits(source.cnpj || source.document_number),
      registry_payload: source.registry_payload || previous.registry_payload || {},
    }));
    setLookupComplete(true);
  };

  const inspectCertificate = async () => {
    if (!certificate || !certificatePassword) return setMessage('Selecione o certificado A1 e informe a senha.');
    if (!/\.(pfx|p12)$/i.test(certificate.name)) return setMessage('Selecione um certificado .pfx ou .p12.');
    if (certificate.size > 2 * 1024 * 1024) return setMessage('O certificado deve ter no máximo 2 MB.');
    setBusyLookup(true);
    setMessage('');
    try {
      const result = await invokeOnboarding<any>({
        action: 'inspect_certificate',
        certificate_base64: await fileToBase64(certificate),
        certificate_password: certificatePassword,
        certificate_name: certificate.name,
      });
      const certificateData = result.certificate || null;
      setCertificateMeta(certificateData);
      const certificateCnpj = digits(certificateData?.holder_cnpj || result.company?.cnpj);
      let resolvedIe = digits(result.company?.state_registration);
      if (certificateCnpj.length === 14) {
        try {
          const registry = await lookupOfficeCompanyByCnpj(certificateCnpj);
          const normalized = registryToOfficeCompany(registry.data || {}, registry.registry || {});
          resolvedIe = digits(normalized.state_registration);
          applyLookup({
            ...normalized,
            document_type: 'cnpj',
            document_number: certificateCnpj,
            cnpj: certificateCnpj,
          });
        } catch {
          applyLookup(result.company || {});
        }
      } else {
        applyLookup(result.company || {});
      }
      setMessage(
        resolvedIe
          ? 'Certificado validado. Dados cadastrais e IE ' + resolvedIe + ' preenchidos automaticamente.'
          : 'Certificado validado. Dados cadastrais preenchidos automaticamente.'
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível validar o certificado.');
    } finally {
      setBusyLookup(false);
    }
  };

  const lookupCnpj = async () => {
    const cnpj = digits(company.document_number || company.cnpj);
    if (cnpj.length !== 14) return setMessage('Informe um CNPJ válido com 14 dígitos.');
    setBusyLookup(true);
    setMessage('');
    try {
      const result = await lookupOfficeCompanyByCnpj(cnpj);
      const normalized = registryToOfficeCompany(result.data || {}, result.registry || {});
      applyLookup({
        ...normalized,
        document_type: 'cnpj',
        document_number: cnpj,
        cnpj,
      });
      setMessage(
        normalized.state_registration
          ? 'Cadastro localizado, incluindo IE ' + normalized.state_registration + '.'
          : 'Cadastro localizado. A inscrição estadual não foi encontrada nas fontes disponíveis.'
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível consultar o CNPJ.');
    } finally {
      setBusyLookup(false);
    }
  };

  const valid = useMemo(() => {
    const userOk = /^[a-z0-9][a-z0-9._-]{2,31}$/.test(username.trim().toLowerCase());
    if (!company.company_name.trim() || !userOk) return false;
    const doc = digits(company.document_number || company.cnpj);
    if (company.document_type === 'cnpj' && doc.length !== 14) return false;
    if (company.document_type === 'cpf' && doc.length !== 11) return false;
    if (company.document_type === 'other' && String(company.document_number || '').trim().length < 3) return false;
    if (method === 'certificate') return Boolean(certificate && certificatePassword && lookupComplete);
    if (method === 'cnpj') return lookupComplete;
    return true;
  }, [company, username, method, certificate, certificatePassword, lookupComplete]);

  const create = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setMessage('');
    try {
      const result = await invokeOnboarding<any>({
        action: 'create',
        method,
        username: username.trim().toLowerCase(),
        company: {
          ...company,
          document_number: company.document_type === 'other' ? company.document_number.trim() : digits(company.document_number || company.cnpj),
          cnpj: company.document_type === 'cnpj' ? digits(company.document_number || company.cnpj) : '',
        },
        certificate_base64: method === 'certificate' && certificate ? await fileToBase64(certificate) : '',
        certificate_password: method === 'certificate' ? certificatePassword : '',
        certificate_name: method === 'certificate' ? certificate?.name || '' : '',
      });
      await onCreated({ company_id: result.company_id, username: result.username });
      close();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível criar o cliente.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const docDisplay = company.document_type === 'cpf'
    ? formatCpf(company.document_number)
    : company.document_type === 'cnpj'
      ? formatCnpj(company.document_number || company.cnpj)
      : company.document_number;

  return (
    <div
      className="fixed inset-0 z-[165] overflow-y-auto bg-black/55 p-3 sm:p-6"
      onMouseDown={event => { if (event.target === event.currentTarget) close(); }}
    >
      <div className="mx-auto w-full max-w-6xl rounded-2xl border border-border bg-background shadow-2xl">
        <header className="sticky top-0 z-20 flex items-start justify-between gap-5 rounded-t-2xl border-b border-border bg-background/95 px-5 py-5 backdrop-blur sm:px-7">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Clientes do escritório</p>
            <h2 className="mt-1 text-xl font-semibold sm:text-2xl">Adicionar cliente</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
              Comece pelo A1, pelo CNPJ ou faça um cadastro manual. O acesso ao portal é criado junto com a empresa.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={close} disabled={busyLookup || saving}><X className="h-4 w-4" /></Button>
        </header>

        <div className="space-y-6 p-5 sm:p-7">
          <section>
            <div className="mb-3">
              <p className="text-sm font-semibold">1. Como deseja adicionar?</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Escolha a fonte inicial dos dados e confira tudo antes de salvar.</p>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              <MethodCard active={method === 'certificate'} icon={FileKey2} title="Certificado A1" description="Identifica o CNPJ, consulta o cadastro e salva o certificado no cofre fiscal." tag="Mais completo" onClick={() => resetForMethod('certificate')} />
              <MethodCard active={method === 'cnpj'} icon={Building2} title="Consultar CNPJ" description="Busca dados cadastrais, endereço, CNAE e inscrição estadual sem armazenar certificado." tag="Preenchimento automático" onClick={() => resetForMethod('cnpj')} />
              <MethodCard active={method === 'manual'} icon={UserRound} title="Preencher manualmente" description="Para CPF, casos sem CNPJ ou quando você preferir informar os dados diretamente." tag="CPF / outros" onClick={() => resetForMethod('manual')} />
            </div>
          </section>

          {method === 'certificate' && (
            <section className="rounded-xl bg-muted/25 p-4 sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,.7fr)_auto] lg:items-end">
                <label className="min-w-0 space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[.08em] text-muted-foreground">Certificado A1 (.pfx ou .p12)</span>
                  <input type="file" accept=".pfx,.p12,application/x-pkcs12" onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setCertificate(event.target.files?.[0] || null);
                    setCertificateMeta(null);
                    setLookupComplete(false);
                    setMessage('');
                  }} className="block h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-xs file:mr-3 file:border-0 file:bg-transparent file:text-xs file:font-semibold" />
                </label>
                <Field label="Senha do A1" type="password" value={certificatePassword} onChange={value => { setCertificatePassword(value); setLookupComplete(false); }} placeholder="Senha do certificado" required />
                <Button onClick={() => void inspectCertificate()} disabled={busyLookup || !certificate || !certificatePassword} className="h-11">
                  {busyLookup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileKey2 className="mr-2 h-4 w-4" />}
                  {busyLookup ? 'Validando...' : 'Validar e preencher'}
                </Button>
              </div>
              {certificateMeta && (
                <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                  <span className="rounded-full bg-background px-2.5 py-1.5">Titular: <b className="text-foreground">{certificateMeta.holder_name || '—'}</b></span>
                  <span className="rounded-full bg-background px-2.5 py-1.5">Validade: <b className="text-foreground">{certificateMeta.valid_until || '—'}</b></span>
                  <span className="rounded-full bg-background px-2.5 py-1.5">CNPJ: <b className="text-foreground">{formatCnpj(certificateMeta.holder_cnpj)}</b></span>
                </div>
              )}
            </section>
          )}

          {method === 'cnpj' && (
            <section className="rounded-xl bg-muted/25 p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Field label="CNPJ" value={formatCnpj(company.document_number)} onChange={value => {
                    const next = digits(value).slice(0, 14);
                    setCompany(previous => ({ ...previous, document_type: 'cnpj', document_number: next, cnpj: next }));
                    setLookupComplete(false);
                  }} placeholder="00.000.000/0000-00" inputMode="numeric" required />
                </div>
                <Button onClick={() => void lookupCnpj()} disabled={busyLookup || digits(company.document_number).length !== 14} className="h-11">
                  {busyLookup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  {busyLookup ? 'Consultando...' : lookupComplete ? 'Atualizar consulta' : 'Buscar e preencher'}
                </Button>
              </div>
            </section>
          )}

          {method === 'manual' && (
            <section className="rounded-xl bg-muted/25 p-4 sm:p-5">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.08em] text-muted-foreground">Tipo de documento</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  ['cnpj', 'CNPJ', 'Pessoa jurídica'],
                  ['cpf', 'CPF', 'Pessoa física'],
                  ['other', 'Outro', 'Cadastro sem CPF/CNPJ'],
                ] as Array<[DocumentType, string, string]>).map(([value, title, copy]) => (
                  <button type="button" key={value} onClick={() => setCompany(previous => ({ ...previous, document_type: value, document_number: '', cnpj: '' }))}
                    className={'rounded-lg px-4 py-3 text-left transition ' + (company.document_type === value ? 'bg-foreground text-background' : 'bg-background hover:bg-muted')}>
                    <strong className="block text-xs">{title}</strong>
                    <span className={'mt-1 block text-[10px] ' + (company.document_type === value ? 'text-background/70' : 'text-muted-foreground')}>{copy}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">2. Dados do cliente</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Revise o cadastro. Campos localizados automaticamente continuam editáveis.</p>
              </div>
              {lookupComplete && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"><BadgeCheck className="h-3.5 w-3.5" /> Dados consultados</span>}
            </div>

            <div className="grid gap-3 rounded-xl border border-border/70 bg-card p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
              <div className="sm:col-span-2"><Field label={company.document_type === 'cpf' ? 'Nome completo' : 'Razão social / nome'} value={company.company_name} onChange={value => set('company_name', value)} required /></div>
              <Field label="Nome fantasia" value={company.trade_name} onChange={value => set('trade_name', value)} />
              {(method === 'manual' || lookupComplete) && (
                <Field label={company.document_type === 'cpf' ? 'CPF' : company.document_type === 'other' ? 'Documento' : 'CNPJ'} value={docDisplay}
                  onChange={value => {
                    const next = company.document_type === 'other' ? value : digits(value);
                    setCompany(previous => ({ ...previous, document_number: next, cnpj: company.document_type === 'cnpj' ? digits(next) : '' }));
                  }}
                  disabled={method === 'certificate'} inputMode={company.document_type === 'other' ? 'text' : 'numeric'} required />
              )}
              {company.document_type === 'cnpj' && (
                <>
                  <Field label="Inscrição estadual" value={company.state_registration} onChange={value => set('state_registration', value)} />
                  <Field label="Porte" value={company.company_size} onChange={value => set('company_size', value)} />
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[.08em] text-muted-foreground">Regime tributário</span>
                    <select value={company.tax_regime} onChange={event => set('tax_regime', event.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">Não informado</option><option value="simples">Simples Nacional</option><option value="mei">MEI</option><option value="presumido">Lucro Presumido</option><option value="real">Lucro Real</option>
                    </select>
                  </label>
                  <Field label="CNAE principal" value={company.cnae_primary} onChange={value => set('cnae_primary', digits(value))} />
                </>
              )}
              <Field label="E-mail" value={company.email} onChange={value => set('email', value)} inputMode="email" />
              <Field label="Telefone" value={company.phone} onChange={value => set('phone', value)} inputMode="tel" />
              <Field label="CEP" value={formatCep(company.postal_code)} onChange={value => set('postal_code', digits(value).slice(0, 8))} inputMode="numeric" />
              <div className="sm:col-span-2"><Field label="Logradouro" value={company.street} onChange={value => set('street', value)} /></div>
              <Field label="Número" value={company.street_number} onChange={value => set('street_number', value)} />
              <Field label="Complemento" value={company.complement} onChange={value => set('complement', value)} />
              <Field label="Bairro" value={company.district} onChange={value => set('district', value)} />
              <Field label="Cidade" value={company.city} onChange={value => set('city', value)} />
              <Field label="UF" value={company.state} onChange={value => set('state', value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))} />
              <Field label="Código IBGE" value={company.city_ibge_code} onChange={value => set('city_ibge_code', digits(value).slice(0, 7))} inputMode="numeric" />
            </div>
          </section>

          <section>
            <div className="mb-3"><p className="text-sm font-semibold">3. Acesso do cliente</p><p className="mt-1 text-[11px] text-muted-foreground">O usuário é criado junto com o cliente e fica vinculado a esta empresa.</p></div>
            <div className="grid gap-4 rounded-xl bg-[#0b1320] p-4 text-slate-100 sm:grid-cols-[minmax(0,1fr)_minmax(250px,.7fr)] sm:p-5">
              <div>
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[.08em] text-slate-400">Nome de usuário *</span>
                  <input value={username} onChange={event => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 32))} autoCapitalize="none" spellCheck={false}
                    placeholder="ex.: empresa.almeida" className="h-11 w-full rounded-md border border-white/10 bg-white/[.06] px-3 text-sm text-white outline-none transition focus:border-white/25" />
                </label>
                <p className="mt-2 text-[10px] leading-4 text-slate-400">3 a 32 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.</p>
              </div>
              <div className="rounded-lg bg-white/[.055] p-3">
                <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.08em] text-slate-400"><KeyRound className="h-3.5 w-3.5" /> Senha de primeiro acesso</span>
                <strong className="mt-2 block font-mono text-base tracking-wide">{DEFAULT_PASSWORD}</strong>
                <p className="mt-2 text-[10px] leading-4 text-slate-400">No primeiro acesso, o cliente recebe o aviso para trocar essa senha por uma senha própria.</p>
              </div>
            </div>
          </section>

          {message && <div className={'rounded-xl px-4 py-3 text-sm ' + (/validado|concluída|localizado|preenchidos/i.test(message) ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-800 dark:text-amber-300')}>{message}</div>}

          <footer className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={close} disabled={saving || busyLookup}>Cancelar</Button>
            <Button onClick={() => void create()} disabled={!valid || saving || busyLookup}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              {saving ? 'Criando cliente...' : 'Criar cliente e acesso'}
            </Button>
          </footer>
        </div>
      </div>
    </div>
  );
}
