import { supabase } from '@/integrations/supabase/client';

export type ProductAccess = {
  saas: boolean;
  extractor: boolean;
  client: boolean;
};

export async function getCurrentProductAccess(): Promise<ProductAccess> {
  const [subscriptionResult, fiscalProfileResult, extractorResult, clientResult] =
    await Promise.all([
      (supabase as any)
        .from('saas_subscriptions')
        .select('id,product_code,status,trial_ends_at,access_expires_at')
        .in('status', ['trialing', 'active', 'past_due'])
        .limit(1),
      (supabase as any).from('saas_company_fiscal_profiles').select('id').limit(1),
      (supabase as any).from('extractor_accounts').select('id').limit(1),
      (supabase as any).from('company_user_links').select('id').limit(1),
    ]);

  const now = Date.now();
  const hasLiveSubscription = (productCode: 'issuer' | 'extractor') =>
    !subscriptionResult.error &&
    Boolean(
      subscriptionResult.data?.some((subscription: any) => {
        if (subscription.product_code !== productCode) return false;
        const boundary =
          subscription.status === 'trialing'
            ? subscription.trial_ends_at
            : subscription.access_expires_at;
        return !boundary || new Date(boundary).getTime() > now;
      })
    );
  const configuredSaasAccess =
    !fiscalProfileResult.error && Boolean(fiscalProfileResult.data?.length);
  const extractorAccess = !extractorResult.error && Boolean(extractorResult.data?.length);

  return {
    saas: hasLiveSubscription('issuer') || configuredSaasAccess,
    extractor: hasLiveSubscription('extractor') || extractorAccess,
    client: !clientResult.error && Boolean(clientResult.data?.length),
  };
}

export async function getPendingCheckoutDestination(): Promise<string | null> {
  const { data, error } = await (supabase as any)
    .from('saas_subscriptions')
    .select('product_code,metadata,created_at')
    .eq('status', 'incomplete')
    .order('created_at', { ascending: false })
    .limit(1);
  if (error || !data?.length) return null;
  const row = data[0];
  const plan =
    typeof row.metadata?.plan_code === 'string'
      ? row.metadata.plan_code
      : row.product_code === 'extractor'
        ? 'extractor_commercial'
        : 'issuer_monthly';
  return row.product_code === 'extractor'
    ? `/assinar/extrator?plan=${encodeURIComponent(plan)}`
    : `/assinar/emissor?plan=${encodeURIComponent(plan)}`;
}
