import { supabase } from '@/integrations/supabase/client';

export const onlyDigits = (value: string | null | undefined) => String(value || '').replace(/\D/g, '');

export async function lookupOfficeCompanyByCnpj(cnpj: string) {
  const normalized = onlyDigits(cnpj);
  if (normalized.length !== 14) throw new Error('Informe um CNPJ válido com 14 dígitos.');

  const { data, error } = await supabase.functions.invoke('saas-registry-lookup', {
    body: { organization_id: 'ws-office-admin', cnpj: normalized },
  });

  if (error || data?.error || !data?.data) {
    throw new Error(data?.error || error?.message || 'Não foi possível consultar o CNPJ agora.');
  }

  return data as {
    ok: boolean;
    data: Record<string, any>;
    registry?: Record<string, any>;
    state_registry_found?: boolean;
    sources?: Record<string, any>;
  };
}

export function registryToOfficeCompany(data: Record<string, any>, registry: Record<string, any> = {}) {
  const address = [
    [data.street, data.street_number].filter(Boolean).join(', '),
    data.complement,
    data.district,
    [data.city, data.state].filter(Boolean).join('/'),
    data.postal_code,
  ].filter(Boolean).join(' · ');

  return {
    company_name: String(data.legal_name || '').trim().toUpperCase(),
    trade_name: String(data.trade_name || data.legal_name || '').trim().toUpperCase(),
    cnpj: onlyDigits(data.tax_id),
    state_registration: onlyDigits(data.state_registration),
    registration_status: String(data.registration_status || registry.registration_status || '').trim().toUpperCase(),
    tax_regime: String(data.tax_regime || '').trim(),
    email: String(data.email || '').trim().toLowerCase(),
    phone: onlyDigits(data.phone || data.mobile),
    postal_code: onlyDigits(data.postal_code),
    street: String(data.street || '').trim().toUpperCase(),
    street_number: String(data.street_number || '').trim().toUpperCase(),
    complement: String(data.complement || '').trim().toUpperCase(),
    district: String(data.district || '').trim().toUpperCase(),
    city: String(data.city || '').trim().toUpperCase(),
    state: String(data.state || '').trim().toUpperCase(),
    city_ibge_code: onlyDigits(data.city_ibge_code),
    cnae_primary: onlyDigits(data.cnae_primary),
    company_size: String(registry.company_size || '').trim().toUpperCase(),
    address,
    registry_payload: { ...registry, lookup: data },
    registry_updated_at: new Date().toISOString(),
  };
}
