import { supabase } from '@/integrations/supabase/client';

export type ProductAccess = {
  saas: boolean;
  extractor: boolean;
};

export async function getCurrentProductAccess(): Promise<ProductAccess> {
  const [subscriptionResult, fiscalProfileResult, extractorResult] = await Promise.all([
    (supabase as any)
      .from('saas_subscriptions')
      .select('id')
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
  ]);

  const subscriptionAccess =
    !subscriptionResult.error && Boolean(subscriptionResult.data?.length);
  const configuredSaasAccess =
    !fiscalProfileResult.error && Boolean(fiscalProfileResult.data?.length);
  const extractorAccess =
    !extractorResult.error && Boolean(extractorResult.data?.length);

  return {
    saas: subscriptionAccess || configuredSaasAccess,
    extractor: extractorAccess,
  };
}
