import { useState } from 'react';
import {
  BadgeCheck,
  Building2,
  Check,
  Copy,
  FileKey2,
  Loader2,
  PenLine,
  Search,
  UserRound,
} from 'lucide-react';
import { SmartCertificateInput } from '@/components/admin/fiscal/CertificateImportTools';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

type Mode = 'certificate' | 'cnpj' | 'manual';

type Form = {
  tax_id: string;
  legal_name: string;
  trade_name: string;
  state_registration: string;
  company_size: string;
  tax_regime: string;
  registration_status: string;
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
  registry: Record<string, unknown>;
};

const DEFAULT_CLIENT_PASSWORD = '5BWasgc1@';
const blank = (): Form => ({
  tax_id: '',
  legal_name: '',
  trade_name: '',
  state_registration: '',
  company_size: '',
  tax_regime: '',
  registration_status: '',
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
  registry: {},
});

const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '');
const formatDocument = (value: string) => {
  const d = digits(value);
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return value;
};

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

async function invokeOnboarding<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-client-onboarding', { body });
  if (!error && !data?.error) return data as T;
  let message = data?.error || error?.message || 'Não foi possível concluir esta operação.';
  try {
    const context = (error as { context?: Response })?.context;
    if (context) message = (await context.clone().json())?.error || message;
  } catch {}
  throw new Error(message);
}

const modeCards: Array<{
  id: Mode;
  title: string;
  description: string;
  icon: typeof FileKey2;
}> = [
  {
    id: 'certificate',
    title: 'Certificado A1',
    description: 'Identifica o CNPJ, consulta o cadastro e já salva o A1 no cofre fiscal.',
    icon: FileKey2,
  },
  {
    id: 'cnpj',
    title: 'Consultar CNPJ',
    description: 'Busca os dados cadastrais e a inscrição estadual, sem adicionar certificado.',
    icon: Search,
  },
  {
    id: 'manual',
    title: 'Cadastro manual',
    description: 'Para CPF ou quando você preferir preencher os dados sem consulta automática.',
    icon: PenLine,
  },
];

export function AdminClientOnboardingDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void> | void;
}) {
  const [mode, setMode] = useState<Mode>('certificate');
  const [form, setForm] = useState<Form>(blank());
  const [username, setUsername] = useState('');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lookupInfo, setLookupInfo] = useState('');
  const [created, setCreated] = useState<{ username: string; companyName: string } | null>(null);

  const reset = (nextMode: Mode = mode) => {
    setMode(nextMode);
    setForm(blank());
    setUsername('');
    setCertificateFile(null);
    setCertificatePassword('');
    setLookupBusy(false);
    setSaving(false);
    setError('');
    setLookupInfo('');
    setCreated(null);
  };

  const setField = (key: keyof Form, value: string | Record<string, unknown>) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const lookup = async (rawCnpj?: string) => {
    const cnpj = digits(rawCnpj ?? form.tax_id);
    if (cnpj.length !== 14) {
      setError('Informe um CNPJ válido com 14 dígitos.');
      return;
    }
    setLookupBusy(true);
    setError('');
    setLookupInfo('');
    try {
      const result = await invokeOnboarding<{
        data: Record<string, any>;
        state_registry_found?: boolean;
        sources?: { federal?: string[]; state?: string };
      }>({ action: 'lookup', cnpj });
      const data = result.data || {};
      setForm(current => ({
        ...current,
        tax_id: cnpj,
        legal_name: String(data.legal_name || current.legal_name || ''),
        trade_name: String(data.trade_name || current.trade_name || ''),
        state_registration: String(data.state_registration || current.state_registration || ''),
        company_size: String(data.company_size || data.registry?.company_size || current.company_size || ''),
        tax_regime: String(data.tax_regime || current.tax_regime || ''),
        registration_status: String(data.registration_status || data.registry?.registration_status || current.registration_status || ''),
        email: String(data.email || current.email || ''),
        phone: String(data.phone || current.phone || ''),
        postal_code: String(data.postal_code || current.postal_code || ''),
        street: String(data.street || current.street || ''),
        street_number: String(data.street_number || current.street_number || ''),
        complement: String(data.complement || current.complement || ''),
        district: String(data.district || current.district || ''),
        city: String(data.city || current.city || ''),
        state: String(data.state || current.state || '').toUpperCase(),
        city_ibge_code: String(data.city_ibge_code || current.city_ibge_code || ''),
        cnae_primary: String(data.cnae_primary || current.cnae_primary || ''),
        registry: data.registry || current.registry || {},
      }));
      const federal = Array.isArray(result.sources?.federal) ? result.sources?.federal.join(' + ') : '';
      const state = result.sources?.state || '';
      setLookupInfo(
        result.state_registry_found
          ? `Cadastro localizado${federal ? ` via ${federal}` : ''}. Inscrição estadual confirmada${state ? ` por ${state}` : ''}.`
          : `Cadastro localizado${federal ? ` via ${federal}` : ''}. Inscrição estadual não foi encontrada automaticamente.`
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível consultar o CNPJ.');
    } finally {
      setLookupBusy(false);
    }
  };

  const submit = async () => {
    if (saving) return;
    const identifier = digits(form.tax_id);
    if (![11, 14].includes(identifier.length)) {
      setError('Informe um CPF ou CNPJ válido.');
      return;
    }
    if (mode !== 'manual' && identifier.length !== 14) {
      setError('Os modos A1 e CNPJ exigem um CNPJ empresarial.');
      return;
    }
    if (!form.legal_name.trim()) {
      setError('Informe a razão social ou o nome completo do cliente.');
      return;
    }
    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/i.test(username.trim())) {
      setError('Informe um nome de usuário com 3 a 32 caracteres.');
      return;
    }
    if (mode === 'certificate' && (!certificateFile || !certificatePassword)) {
      setError('Selecione e valide o certificado A1 antes de criar o cliente.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        action: 'create',
        mode,
        username: username.trim().toLowerCase(),
        company: {
          ...form,
          tax_id: identifier,
        },
      };
      if (mode === 'certificate' && certificateFile) {
        body.certificate_base64 = await fileToBase64(certificateFile);
        body.certificate_password = certificatePassword;
        body.certificate_name = certificateFile.name;
      }
      const result = await invokeOnboarding<any>(body);
      setCreated({
        username: result?.user?.username || username.trim().toLowerCase(),
        companyName: result?.company?.trade_name || result?.company?.company_name || form.trade_name || form.legal_name,
      });
      await onCreated();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível criar o cliente.');
    } finally {
      setSaving(false);
    }
  };

  const identifierLength = digits(form.tax_id).length;
  const isCompany = identifierLength === 14;
  const canLookup = isCompany && !lookupBusy && mode !== 'manual';

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (saving) return;
        if (!next) reset('certificate');
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        {!created ? (
          <>
            <div className="flex items-start justify-between gap-4 pr-8">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">
                  Cliente do escritório
                </p>
                <DialogTitle className="mt-1 text-2xl">Adicionar novo cliente</DialogTitle>
                <DialogDescription className="mt-2 max-w-2xl">
                  Escolha como o cadastro será criado. O acesso do cliente é configurado no mesmo fluxo e fica vinculado à empresa correta.
                </DialogDescription>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {modeCards.map(item => {
                const Icon = item.icon;
                const active = mode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (saving) return;
                      reset(item.id);
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? 'border-foreground/25 bg-muted/55 shadow-sm'
                        : 'border-border/60 bg-card hover:bg-muted/25'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted">
                        <Icon className="h-5 w-5" strokeWidth={1.8} />
                      </span>
                      {active && <Check className="h-4 w-4 text-foreground" />}
                    </div>
                    <strong className="mt-5 block text-sm">{item.title}</strong>
                    <span className="mt-1.5 block text-xs leading-5 text-muted-foreground">
                      {item.description}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
              <section className="space-y-5 rounded-2xl border border-border/60 bg-card p-5">
                <div>
                  <h3 className="font-semibold">Dados da empresa</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {mode === 'certificate'
                      ? 'O certificado identifica o CNPJ. Depois da validação, os dados cadastrais são consultados automaticamente.'
                      : mode === 'cnpj'
                        ? 'Informe o CNPJ e consulte para preencher os dados automaticamente.'
                        : 'Preencha os dados manualmente. Este modo também aceita cliente pessoa física.'}
                  </p>
                </div>

                {mode === 'certificate' && (
                  <SmartCertificateInput
                    editing={false}
                    onFile={file => {
                      setCertificateFile(file);
                      setError('');
                    }}
                    onPassword={setCertificatePassword}
                    onMetadata={metadata => {
                      const cnpj = digits(metadata.holder_cnpj);
                      setForm(current => ({
                        ...current,
                        tax_id: cnpj,
                        legal_name: current.legal_name || metadata.holder_name || '',
                      }));
                      if (cnpj.length === 14) void lookup(cnpj);
                    }}
                  />
                )}

                {mode === 'cnpj' && (
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <Field label="CNPJ">
                      <Input
                        value={form.tax_id}
                        onChange={event => setField('tax_id', event.target.value)}
                        placeholder="00.000.000/0000-00"
                      />
                    </Field>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!canLookup}
                      onClick={() => void lookup()}
                    >
                      {lookupBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                      Consultar
                    </Button>
                  </div>
                )}

                {mode === 'manual' && (
                  <Field label="CPF ou CNPJ">
                    <Input
                      value={form.tax_id}
                      onChange={event => setField('tax_id', event.target.value)}
                      placeholder="CPF ou CNPJ"
                    />
                  </Field>
                )}

                {mode === 'certificate' && (
                  <div className="rounded-xl border border-border/55 bg-muted/15 px-4 py-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">Documento identificado</span>
                    <p className="mt-1 text-sm font-medium">{form.tax_id ? formatDocument(form.tax_id) : 'Aguardando certificado válido'}</p>
                  </div>
                )}

                {lookupInfo && (
                  <div className="flex gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{lookupInfo}</span>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={isCompany || mode !== 'manual' ? 'Razão social' : 'Nome completo'}>
                    <Input value={form.legal_name} onChange={event => setField('legal_name', event.target.value)} />
                  </Field>
                  <Field label="Nome fantasia">
                    <Input value={form.trade_name} onChange={event => setField('trade_name', event.target.value)} />
                  </Field>
                  <Field label="Inscrição estadual">
                    <Input value={form.state_registration} onChange={event => setField('state_registration', event.target.value)} />
                  </Field>
                  <Field label="Porte">
                    <Input value={form.company_size} onChange={event => setField('company_size', event.target.value)} />
                  </Field>
                  <Field label="Regime tributário">
                    <Input value={form.tax_regime} onChange={event => setField('tax_regime', event.target.value)} />
                  </Field>
                  <Field label="Situação cadastral">
                    <Input value={form.registration_status} onChange={event => setField('registration_status', event.target.value)} />
                  </Field>
                  <Field label="E-mail da empresa">
                    <Input value={form.email} onChange={event => setField('email', event.target.value)} />
                  </Field>
                  <Field label="Telefone">
                    <Input value={form.phone} onChange={event => setField('phone', event.target.value)} />
                  </Field>
                </div>

                <div className="border-t border-border/60 pt-5">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">
                    Endereço
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="CEP">
                      <Input value={form.postal_code} onChange={event => setField('postal_code', event.target.value)} />
                    </Field>
                    <Field label="UF">
                      <Input maxLength={2} value={form.state} onChange={event => setField('state', event.target.value.toUpperCase())} />
                    </Field>
                    <Field label="Município">
                      <Input value={form.city} onChange={event => setField('city', event.target.value)} />
                    </Field>
                    <Field label="Código IBGE">
                      <Input value={form.city_ibge_code} onChange={event => setField('city_ibge_code', event.target.value)} />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Logradouro">
                        <Input value={form.street} onChange={event => setField('street', event.target.value)} />
                      </Field>
                    </div>
                    <Field label="Número">
                      <Input value={form.street_number} onChange={event => setField('street_number', event.target.value)} />
                    </Field>
                    <Field label="Bairro">
                      <Input value={form.district} onChange={event => setField('district', event.target.value)} />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Complemento">
                        <Input value={form.complement} onChange={event => setField('complement', event.target.value)} />
                      </Field>
                    </div>
                  </div>
                </div>
              </section>

              <aside className="space-y-4">
                <section className="rounded-2xl border border-border/60 bg-card p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted">
                      <UserRound className="h-5 w-5" strokeWidth={1.8} />
                    </span>
                    <div>
                      <h3 className="font-semibold">Acesso do cliente</h3>
                      <p className="text-xs text-muted-foreground">Obrigatório em qualquer modo</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <Field label="Nome de usuário">
                      <Input
                        autoCapitalize="none"
                        spellCheck={false}
                        value={username}
                        onChange={event => setUsername(event.target.value.toLowerCase())}
                        placeholder="empresaexemplo"
                      />
                    </Field>

                    <div className="rounded-xl border border-border/55 bg-muted/20 p-4">
                      <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
                        Senha padrão
                      </span>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <code className="text-sm font-semibold">{DEFAULT_CLIENT_PASSWORD}</code>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => void navigator.clipboard?.writeText(DEFAULT_CLIENT_PASSWORD)}
                          title="Copiar senha padrão"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        No primeiro acesso, o cliente será obrigado a substituir esta senha por uma senha própria.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-border/60 bg-muted/10 p-5">
                  <div className="flex gap-3">
                    <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <strong className="text-sm">Um cadastro, vários módulos</strong>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        A empresa é criada no cadastro central do escritório. Quando houver CNPJ, o perfil fiscal é vinculado ao mesmo registro — sem duplicar empresa.
                      </p>
                    </div>
                  </div>
                </section>
              </aside>
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-border/60 pt-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" disabled={saving || lookupBusy} onClick={() => void submit()}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {saving ? 'Criando cliente...' : 'Criar cliente e acesso'}
              </Button>
            </div>
          </>
        ) : (
          <div className="py-3">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              <BadgeCheck className="h-7 w-7" />
            </div>
            <div className="mx-auto mt-5 max-w-lg text-center">
              <DialogTitle className="text-2xl">Cliente criado</DialogTitle>
              <DialogDescription className="mt-2">
                {created.companyName} já está no painel e o acesso do cliente foi vinculado ao cadastro.
              </DialogDescription>
            </div>

            <div className="mx-auto mt-7 max-w-lg rounded-2xl border border-border/60 bg-muted/15 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Credential label="Usuário" value={created.username} />
                <Credential label="Senha inicial" value={DEFAULT_CLIENT_PASSWORD} />
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                A senha inicial é temporária. No primeiro acesso o portal exigirá uma nova senha antes de liberar o uso normal.
              </p>
            </div>

            <div className="mt-7 flex justify-center">
              <Button
                onClick={() => {
                  reset('certificate');
                  onOpenChange(false);
                }}
              >
                Concluir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Credential({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/55 bg-background p-4">
      <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
        {label}
      </span>
      <div className="mt-2 flex items-center justify-between gap-2">
        <code className="truncate text-sm font-semibold">{value}</code>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => void navigator.clipboard?.writeText(value)}
          title={`Copiar ${label.toLowerCase()}`}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
