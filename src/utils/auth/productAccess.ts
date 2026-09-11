import { supabase } from '@/integrations/supabase/client';

export type ProductAccess = {
  saas: boolean;
  extractor: boolean;
  client: boolean;
};

export async function getCurrentProductAccess(): Promise<ProductAccess> {
  const [subscriptionResult, fiscalProfileResult, extractorResult, clientResult] = await Promise.all([
    (supabase as any)
      .from('saas_subscriptions')
      .select('id,status,trial_ends_at,access_expires_at')
      .in('status', ['trialing', 'active', 'past_due'])
      .limit(1),
    (supabase as any)
      .from('saas_company_fiscal_profiles')
      .select('id')
      .limit(1),
    (supabase as any)
      .from('extractor_accounts')
      .select('id')
      .limit(1),
    (supabase as any)
      .from('company_user_links')
      .select('id')
      .limit(1),
  ]);

  const now = Date.now();
  const subscriptionAccess = !subscriptionResult.error && Boolean(subscriptionResult.data?.some((subscription: any) => {
    const boundary = subscription.status === 'trialing' ? subscription.trial_ends_at : subscription.access_expires_at;
    return !boundary || new Date(boundary).getTime() > now;
  }));
  const configuredSaasAccess =
    !fiscalProfileResult.error && Boolean(fiscalProfileResult.data?.length);
  const extractorAccess =
    !extractorResult.error && Boolean(extractorResult.data?.length);

  return {
    saas: subscriptionAccess || configuredSaasAccess,
    extractor: extractorAccess,
    client: !clientResult.error && Boolean(clientResult.data?.length),
  };
}
