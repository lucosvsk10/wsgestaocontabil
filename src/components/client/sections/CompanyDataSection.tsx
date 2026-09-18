import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Calendar, CreditCard, Mail, MapPin, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type OfficeCompany = {
  id: string;
  company_name: string;
  trade_name: string | null;
  cnpj: string | null;
  document_type: 'cnpj' | 'cpf' | 'other' | null;
  document_number: string | null;
  state_registration: string | null;
  tax_regime: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  street: string | null;
  street_number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  registry_payload: any;
  created_at: string | null;
};

const digits = (value: unknown) => String(value || '').replace(/\D/g, '');
const formatDocument = (company: OfficeCompany) => {
  const value = company.document_number || company.cnpj || '';
  const d = digits(value);
  if (company.document_type === 'cpf' && d.length === 11)
    return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  if ((company.document_type === 'cnpj' || company.cnpj) && d.length === 14)
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  return value || '—';
};
const fullAddress = (company: OfficeCompany) =>
  company.address ||
  [company.street, company.street_number, company.complement, company.district, company.city, company.state, company.postal_code]
    .filter(Boolean)
    .join(', ') ||
  '—';

export const CompanyDataSection = () => {
  const { user } = useAuth();
  const [company, setCompany] = useState<OfficeCompany | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!user) {
        if (active) setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: link, error: linkError } = await (supabase as any)
          .from('company_user_links')
          .select('company_id,is_primary')
          .eq('user_id', user.id)
          .order('is_primary', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (linkError) throw linkError;

        if (link?.company_id) {
          const { data, error } = await (supabase as any)
            .from('companies')
            .select('id,company_name,trade_name,cnpj,document_type,document_number,state_registration,tax_regime,email,phone,address,street,street_number,complement,district,city,state,postal_code,registry_payload,created_at')
            .eq('id', link.company_id)
            .maybeSingle();
          if (error) throw error;
          if (active) setCompany(data || null);
          return;
        }

        // Compatibilidade com clientes muito antigos ainda sem company_user_links.
        const { data: legacy, error: legacyError } = await supabase
          .from('company_data')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (legacyError) throw legacyError;
        if (active && legacy) {
          setCompany({
            id: legacy.id,
            company_name: legacy.name,
            trade_name: legacy.fantasy_name || null,
            cnpj: legacy.cnpj,
            document_type: 'cnpj',
            document_number: legacy.cnpj,
            state_registration: null,
            tax_regime: legacy.tax_regime,
            email: legacy.email,
            phone: legacy.phone,
            address: legacy.address,
            street: null,
            street_number: legacy.number || null,
            complement: null,
            district: legacy.neighborhood || null,
            city: legacy.city || null,
            state: legacy.state || null,
            postal_code: legacy.postal_code || null,
            registry_payload: { opening_date: legacy.opening_date },
            created_at: legacy.created_at,
          });
        }
      } catch (error) {
        console.error('Erro ao buscar dados da empresa:', error);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="space-y-3">{[1, 2, 3].map(item => <div key={item} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>
      </div>
    );
  }

  const Row = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) => (
    <div className="flex items-center gap-3 rounded-lg px-4 py-3.5 transition hover:bg-muted/50">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted"><Icon className="h-4 w-4 text-muted-foreground" /></span>
      <span className="w-32 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-words text-sm font-medium">{value || '—'}</span>
    </div>
  );

  const openingDate = company?.registry_payload?.opening_date
    ? new Date(String(company.registry_payload.opening_date) + 'T12:00:00').toLocaleDateString('pt-BR')
    : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8 rounded-2xl bg-card p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">Empresa vinculada</p>
        <h1 className="mt-2 text-2xl font-semibold">{company?.trade_name || company?.company_name || 'Dados da empresa'}</h1>
        {company?.trade_name && <p className="mt-1 text-sm text-muted-foreground">{company.company_name}</p>}
      </header>

      {!company ? (
        <div className="rounded-xl bg-card p-12 text-center">
          <Building2 className="mx-auto h-5 w-5 text-muted-foreground" />
          <h3 className="mt-4 text-sm font-medium">Empresa não vinculada</h3>
          <p className="mt-1 text-xs text-muted-foreground">Entre em contato com o escritório para revisar o seu acesso.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <section className="overflow-hidden rounded-xl bg-card">
            <div className="border-b border-border/50 px-5 py-3">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Informações cadastrais</h2>
            </div>
            <div className="p-2">
              <Row icon={Building2} label="Razão social / nome" value={company.company_name} />
              <Row icon={CreditCard} label={company.document_type === 'cpf' ? 'CPF' : company.document_type === 'other' ? 'Documento' : 'CNPJ'} value={formatDocument(company)} />
              {company.document_type !== 'cpf' && <Row icon={CreditCard} label="Inscrição estadual" value={company.state_registration} />}
              <Row icon={Calendar} label="Início da atividade" value={openingDate} />
              <Row icon={Building2} label="Regime" value={company.tax_regime} />
            </div>
          </section>

          <section className="overflow-hidden rounded-xl bg-card">
            <div className="border-b border-border/50 px-5 py-3">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Contato e endereço</h2>
            </div>
            <div className="p-2">
              <Row icon={Phone} label="Telefone" value={company.phone} />
              <Row icon={Mail} label="E-mail" value={company.email} />
              <Row icon={MapPin} label="Endereço" value={fullAddress(company)} />
            </div>
          </section>
        </div>
      )}
    </motion.div>
  );
};
