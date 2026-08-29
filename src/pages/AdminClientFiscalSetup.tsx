import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileKey2, ShieldCheck } from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { SmartCertificateInput } from '@/components/admin/fiscal/CertificateImportTools';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

type OfficeClient = {
  id: string;
  cnpj: string;
  company_name: string;
  trade_name: string | null;
};

type FiscalProfile = {
  id: string;
  company_id: string | null;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  uf: string | null;
  municipio: string | null;
  codigo_municipio: string | null;
  inscricao_estadual: string | null;
  regime_tributario: string | null;
};

type Certificate = {
  certificate_name: string;
  holder_cnpj: string | null;
  holder_name: string | null;
  valid_until: string;
  is_active: boolean;
};

type CertMeta = { holder_cnpj: string; holder_name: string; valid_from?: string; valid_until?: string };

const digits = (value: string) => String(value || '').replace(/\D/g, '');

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

async function callVault(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('fiscal-company-vault', { body });
  if (!error) return data;
  let message = error.message;
  try {
    const context = (error as { context?: Response }).context;
    if (context) message = (await context.clone().json())?.error || message;
  } catch {}
  throw new Error(message);
}

export default function AdminClientFiscalSetup() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<OfficeClient | null>(null);
  const [profile, setProfile] = useState<FiscalProfile | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [metadata, setMetadata] = useState<CertMeta | null>(null);
  const [uf, setUf] = useState('AL');
  const [municipio, setMunicipio] = useState('');
  const [codigoMunicipio, setCodigoMunicipio] = useState('');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!companyId) return;
      setLoading(true);
      setError('');
      try {
        const companyResult = await supabase.from('companies').select('id,cnpj,company_name,trade_name').eq('id', companyId).single();
        if (companyResult.error) throw companyResult.error;
        const officeClient = companyResult.data as OfficeClient;
        setClient(officeClient);

        const fiscalResult = await supabase.from('fiscal_companies').select('id,company_id,cnpj,razao_social,nome_fantasia,uf,municipio,codigo_municipio,inscricao_estadual,regime_tributario').eq('company_id', companyId).maybeSingle();
        if (fiscalResult.error) throw fiscalResult.error;
        const fiscalProfile = fiscalResult.data as FiscalProfile | null;
        setProfile(fiscalProfile);
        if (fiscalProfile) {
          setUf(fiscalProfile.uf || 'AL');
          setMunicipio(fiscalProfile.municipio || '');
          setCodigoMunicipio(fiscalProfile.codigo_municipio || '');
          setInscricaoEstadual(fiscalProfile.inscricao_estadual || '');

          const certResult = await supabase.from('fiscal_certificates').select('certificate_name,holder_cnpj,holder_name,valid_until,is_active').eq('company_id', fiscalProfile.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle();
          if (certResult.error) throw certResult.error;
          setCertificate(certResult.data as Certificate | null);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [companyId]);

  const certificateMismatch = useMemo(() => Boolean(metadata && client && digits(metadata.holder_cnpj) !== digits(client.cnpj)), [metadata, client]);

  const save = async () => {
    if (!client) return;
    if (!file && !profile) {
      setError('Selecione o certificado A1 deste cliente.');
      return;
    }
    if (certificateMismatch) {
      setError('O CNPJ do certificado não corresponde ao CNPJ deste cliente.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const body: Record<string, unknown> = {
        action: 'save',
        company: {
          id: profile?.id || undefined,
          company_id: client.id,
          cnpj: digits(client.cnpj),
          razao_social: client.company_name,
          nome_fantasia: client.trade_name || client.company_name,
          uf: uf.toUpperCase(),
          municipio,
          codigo_municipio: codigoMunicipio,
          inscricao_estadual: inscricaoEstadual,
          regime_tributario: profile?.regime_tributario || 'simples_nacional',
          ambiente_padrao: 'producao',
          status: 'ativa',
          endereco: {}
        }
      };
      if (file) {
        body.certificate_base64 = await fileToBase64(file);
        body.certificate_password = password;
        body.certificate_name = file.name;
      }
      await callVault(body);
      setSuccess('Configuração fiscal salva. Este cliente já pode ser selecionado no extrator.');
      setTimeout(() => navigate('/admin/clientes'), 700);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLayout><div className="p-10 text-sm text-muted-foreground">Carregando cliente...</div></AdminLayout>;
  if (!client) return <AdminLayout><div className="p-10 text-sm text-destructive">Cliente não encontrado.</div></AdminLayout>;

  return (
    <AdminLayout>
      <main className="mx-auto w-full max-w-4xl px-5 py-6 lg:px-8">
        <Button variant="ghost" className="mb-4 -ml-2" onClick={() => navigate('/admin/clientes')}><ArrowLeft className="mr-2 h-4 w-4" />Voltar aos clientes</Button>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Cliente do escritório · Fiscal</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{client.trade_name || client.company_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">O certificado e a configuração fiscal ficam vinculados a este cliente. Nenhuma nova empresa é criada em paralelo.</p>
        </div>

        <section className="mt-6 space-y-6 rounded-2xl border border-border/60 bg-card p-6">
          {certificate && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-muted/20 p-4">
              <div className="flex items-center gap-3"><div className="rounded-lg bg-background p-2"><FileKey2 className="h-5 w-5" /></div><div><p className="text-sm font-medium">{certificate.certificate_name}</p><p className="text-xs text-muted-foreground">A1 ativo até {new Date(`${certificate.valid_until}T12:00:00`).toLocaleDateString('pt-BR')}</p></div></div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"><ShieldCheck className="h-4 w-4" />Configurado</span>
            </div>
          )}

          <div>
            <h2 className="font-semibold">Certificado digital A1</h2>
            <p className="mt-1 text-sm text-muted-foreground">O CNPJ do certificado é conferido contra o cadastro do cliente antes de salvar.</p>
            <div className="mt-4"><SmartCertificateInput editing={Boolean(profile)} onFile={setFile} onPassword={setPassword} onMetadata={setMetadata} /></div>
            {certificateMismatch && <p className="mt-2 text-sm text-destructive">Este certificado pertence a outro CNPJ e não pode ser vinculado a este cliente.</p>}
          </div>

          <div className="grid gap-4 border-t border-border/60 pt-6 sm:grid-cols-2">
            <Field label="UF"><Input value={uf} maxLength={2} onChange={event => setUf(event.target.value.toUpperCase())} /></Field>
            <Field label="Inscrição estadual"><Input value={inscricaoEstadual} onChange={event => setInscricaoEstadual(event.target.value)} /></Field>
            <Field label="Município"><Input value={municipio} onChange={event => setMunicipio(event.target.value)} /></Field>
            <Field label="Código IBGE"><Input value={codigoMunicipio} onChange={event => setCodigoMunicipio(event.target.value)} /></Field>
          </div>

          {error && <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
          {success && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{success}</div>}
          <div className="flex justify-end"><Button disabled={saving || certificateMismatch} onClick={() => void save()}>{saving ? 'Salvando...' : 'Salvar configuração fiscal'}</Button></div>
        </section>
      </main>
    </AdminLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
