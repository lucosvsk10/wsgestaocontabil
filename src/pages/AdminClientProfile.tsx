import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, FileKey2, FileText, ImagePlus, ReceiptText, Save, ShieldCheck } from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminPage, AdminPageHeader, AdminSection } from '@/components/admin/ui/AdminPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useCompanySelection } from '@/contexts/CompanySelectionContext';

const digits = (value: string) => String(value || '').replace(/\D/g, '');
const formatCnpj = (value: string) => {
  const valueDigits = digits(value);
  return valueDigits.length === 14 ? valueDigits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : value;
};

type Client = {
  id: string;
  company_name: string;
  trade_name: string | null;
  cnpj: string;
  address: string | null;
  company_size: string | null;
  logo_url?: string | null;
};

type PortalLink = { user_id: string };
type FiscalProfile = { id: string; status: string; cnpj: string };
type Certificate = { certificate_name: string; valid_until: string; is_active: boolean };

export default function AdminClientProfile() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { selectCompany, refreshCompanies } = useCompanySelection();
  const [client, setClient] = useState<Client | null>(null);
  const [portalUserId, setPortalUserId] = useState<string | null>(null);
  const [fiscal, setFiscal] = useState<FiscalProfile | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const [companyResult, portalResult, fiscalResult] = await Promise.all([
        supabase.from('companies').select('id,company_name,trade_name,cnpj,address,company_size,logo_url').eq('id', companyId).single(),
        supabase.from('company_user_links' as never).select('user_id').eq('company_id', companyId).maybeSingle(),
        supabase.from('fiscal_companies').select('id,status,cnpj').eq('company_id', companyId).maybeSingle(),
      ]);
      if (companyResult.error) throw companyResult.error;
      if (portalResult.error) throw portalResult.error;
      if (fiscalResult.error) throw fiscalResult.error;

      const company = companyResult.data as unknown as Client;
      const portal = portalResult.data as unknown as PortalLink | null;
      const fiscalProfile = fiscalResult.data as FiscalProfile | null;
      setClient(company);
      setPortalUserId(portal?.user_id || null);
      setFiscal(fiscalProfile);
      selectCompany(company.id);

      if (fiscalProfile) {
        const certResult = await supabase.from('fiscal_certificates').select('certificate_name,valid_until,is_active').eq('company_id', fiscalProfile.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (certResult.error) throw certResult.error;
        setCertificate(certResult.data as Certificate | null);
      } else setCertificate(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [companyId]);

  const save = async () => {
    if (!client) return;
    setSaving(true);
    setError('');
    try {
      const { error: updateError } = await supabase.from('companies').update({
        company_name: client.company_name.trim(),
        trade_name: client.trade_name?.trim() || null,
        cnpj: digits(client.cnpj),
        address: client.address?.trim() || null,
        company_size: client.company_size?.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', client.id);
      if (updateError) throw updateError;
      await refreshCompanies();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally { setSaving(false); }
  };

  const uploadLogo = async (file: File) => {
    if (!client) return;
    if (!file.type.startsWith('image/')) return;
    setUploadingLogo(true);
    setError('');
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `companies/${client.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('carousel-logos').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('carousel-logos').getPublicUrl(path);
      const { error: companyError } = await supabase.from('companies').update({ logo_url: publicUrl } as never).eq('id', client.id);
      if (companyError) throw companyError;
      await supabase.from('carousel_items').update({ logo_url: publicUrl } as never).eq('company_id', client.id);
      setClient(current => current ? { ...current, logo_url: publicUrl } : current);
      await refreshCompanies();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : String(uploadError));
    } finally { setUploadingLogo(false); }
  };

  if (loading) return <AdminLayout><AdminPage><div className="py-16 text-center text-sm text-muted-foreground">Carregando empresa...</div></AdminPage></AdminLayout>;
  if (!client) return <AdminLayout><AdminPage><div className="py-16 text-center text-sm text-destructive">Empresa não encontrada.</div></AdminPage></AdminLayout>;

  return (
    <AdminLayout>
      <AdminPage>
        <Button variant="ghost" className="mb-4 -ml-2" onClick={() => navigate('/admin/clientes')}><ArrowLeft className="mr-2 h-4 w-4" />Clientes</Button>
        <AdminPageHeader eyebrow="Cliente do escritório" title={client.trade_name || client.company_name} description="Cadastro central da empresa. Logo, documentos e configuração fiscal partem deste mesmo registro." actions={<Button onClick={() => void save()} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Salvando...' : 'Salvar'}</Button>} />

        {error && <div className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

        <div className="mt-6 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <AdminSection className="p-5">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-muted/25">
                {client.logo_url ? <img src={client.logo_url} alt={client.trade_name || client.company_name} className="h-full w-full object-contain" /> : <Building2 className="h-9 w-9 text-muted-foreground" />}
              </div>
              <p className="mt-4 font-semibold">{client.trade_name || client.company_name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatCnpj(client.cnpj)}</p>
              <label className="mt-4 inline-flex cursor-pointer items-center rounded-lg border border-border/60 px-3 py-2 text-xs font-medium transition hover:bg-muted/35">
                <ImagePlus className="mr-2 h-4 w-4" />{uploadingLogo ? 'Enviando...' : 'Alterar logo'}
                <input className="hidden" type="file" accept="image/*" disabled={uploadingLogo} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadLogo(file); event.currentTarget.value = ''; }} />
              </label>
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">Esta é a logo oficial da empresa no sistema. O carrossel usa a mesma imagem quando a empresa estiver publicada.</p>
            </div>
          </AdminSection>

          <div className="space-y-5">
            <AdminSection className="p-5">
              <h2 className="font-semibold">Dados da empresa</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Razão social"><Input value={client.company_name} onChange={event => setClient({ ...client, company_name: event.target.value })} /></Field>
                <Field label="Nome fantasia"><Input value={client.trade_name || ''} onChange={event => setClient({ ...client, trade_name: event.target.value })} /></Field>
                <Field label="CNPJ"><Input value={client.cnpj} onChange={event => setClient({ ...client, cnpj: event.target.value })} /></Field>
                <Field label="Porte"><Input value={client.company_size || ''} onChange={event => setClient({ ...client, company_size: event.target.value })} /></Field>
                <div className="sm:col-span-2"><Field label="Endereço"><Input value={client.address || ''} onChange={event => setClient({ ...client, address: event.target.value })} /></Field></div>
              </div>
            </AdminSection>

            <div className="grid gap-4 md:grid-cols-3">
              <ActionCard icon={<FileText className="h-5 w-5" />} title="Documentos" description={portalUserId ? 'Envio e acompanhamento dos documentos deste cliente.' : 'Este cliente ainda não possui acesso do portal vinculado.'} action="Abrir documentos" disabled={!portalUserId} onClick={() => portalUserId && navigate(`/admin/user-documents/${portalUserId}`)} />
              <ActionCard icon={<FileKey2 className="h-5 w-5" />} title="Certificado A1" description={certificate ? `${certificate.certificate_name} · válido até ${new Date(`${certificate.valid_until}T12:00:00`).toLocaleDateString('pt-BR')}` : 'Configure o certificado digital usado nas rotinas fiscais.'} action={certificate ? 'Gerenciar A1' : 'Adicionar A1'} onClick={() => navigate(`/admin/clientes/${client.id}/fiscal`)} badge={certificate ? <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400"><ShieldCheck className="h-3.5 w-3.5" />Ativo</span> : undefined} />
              <ActionCard icon={<ReceiptText className="h-5 w-5" />} title="Fiscal" description={fiscal ? 'Empresa pronta para uso no extrator e na emissão fiscal.' : 'A configuração fiscal é criada junto com o A1.'} action="Abrir extrato" disabled={!fiscal} onClick={() => { if (!fiscal) return; localStorage.setItem('ws_fiscal_company_id', fiscal.id); navigate('/admin/feature'); }} />
            </div>
          </div>
        </div>
      </AdminPage>
    </AdminLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}

function ActionCard({ icon, title, description, action, onClick, disabled, badge }: { icon: React.ReactNode; title: string; description: string; action: string; onClick: () => void; disabled?: boolean; badge?: React.ReactNode }) {
  return <AdminSection className="flex min-h-[190px] flex-col p-5"><div className="flex items-start justify-between gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/45">{icon}</div>{badge}</div><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-1 flex-1 text-xs leading-5 text-muted-foreground">{description}</p><Button className="mt-4 w-full" variant="outline" disabled={disabled} onClick={onClick}>{action}</Button></AdminSection>;
}
