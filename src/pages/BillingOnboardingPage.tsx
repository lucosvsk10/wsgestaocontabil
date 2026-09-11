import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CreditCard, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import '@/styles/billing-onboarding.css';

type Product = 'issuer' | 'extractor';
type BillingMode = 'recurring' | 'one_time';
type PlanCode = 'issuer_monthly' | 'extractor_commercial' | 'extractor_enterprise';

const planCatalog: Record<PlanCode, { product: Product; label: string; price: number; description: string; details: string[] }> = {
  issuer_monthly: { product: 'issuer', label: 'Emissor Fiscal', price: 69, description: 'Emita sem limite de notas.', details: ['NF-e, NFC-e, NFS-e, CT-e e MDF-e', 'Cadastros e histórico organizados', 'Suporte da equipe WS'] },
  extractor_commercial: { product: 'extractor', label: 'Extrator Comercial', price: 99, description: 'Para carteiras de até 20 mil XML por mês.', details: ['Compras e vendas por CNPJ', 'Até 20.000 XML mensais', 'Download e organização dos XML'] },
  extractor_enterprise: { product: 'extractor', label: 'Extrator Empresarial', price: 250, description: 'Para operações sem limite de XML ou empresas.', details: ['XML e empresas ilimitados', 'Compras e vendas por CNPJ', 'Download e organização dos XML'] },
};

export default function BillingOnboardingPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const initialProduct: Product = params.get('product') === 'extractor' ? 'extractor' : 'issuer';
  const requestedPlan = params.get('plan') as PlanCode | null;
  const [product, setProduct] = useState<Product>(initialProduct);
  const [planCode, setPlanCode] = useState<PlanCode>(requestedPlan && planCatalog[requestedPlan]?.product === initialProduct ? requestedPlan : initialProduct === 'issuer' ? 'issuer_monthly' : 'extractor_commercial');
  const [billingMode, setBillingMode] = useState<BillingMode>('recurring');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const selected = planCatalog[planCode];
  const status = params.get('status');
  const productPlans = Object.entries(planCatalog).filter(([, plan]) => plan.product === product) as [PlanCode, typeof selected][];

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    if (!status || !['success', 'pending', 'return'].includes(status)) return;
    let cancelled = false; let attempts = 0;
    const checkAccess = async () => {
      const { data } = await (supabase as any).from('saas_subscriptions').select('status,product_code,trial_ends_at,access_expires_at').eq('product_code', product).in('status', ['trialing', 'active']).order('created_at', { ascending: false }).limit(1);
      const subscription = data?.[0];
      const boundary = subscription?.status === 'trialing' ? subscription?.trial_ends_at : subscription?.access_expires_at;
      if (!cancelled && subscription && (!boundary || new Date(boundary).getTime() > Date.now())) { navigate(product === 'issuer' ? '/app' : '/extrator', { replace: true }); return; }
      attempts += 1; if (!cancelled && attempts < 10) window.setTimeout(() => void checkAccess(), 2000);
    };
    void checkAccess(); return () => { cancelled = true; };
  }, [navigate, product, status]);
  const changeProduct = (next: Product) => { setProduct(next); setPlanCode(next === 'issuer' ? 'issuer_monthly' : 'extractor_commercial'); };
  const startCheckout = async () => {
    setError(''); setLoading(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('mp-start-checkout', { body: { planCode, billingMode, termsAccepted: accepted } });
      if (invokeError || data?.error) throw new Error(data?.error || invokeError?.message || 'Não foi possível abrir o pagamento.');
      if (!data?.checkoutUrl) throw new Error('O Mercado Pago não retornou um endereço de pagamento.');
      window.location.assign(data.checkoutUrl);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível continuar.'); setLoading(false); }
  };

  return <main className={`billing-page billing-${product}`}>
    <header className="billing-header"><Link to={product === 'issuer' ? '/emissor-fiscal' : '/extrator-fiscal'}><ArrowLeft /> Voltar</Link><img src="/assets/ws-logo.png" alt="WS Gestão Contábil" /><span><ShieldCheck /> Checkout protegido</span></header>
    <section className="billing-shell">
      <div className="billing-copy">
        <span className="billing-eyebrow"><Sparkles /> COMECE SEM RISCO</span>
        <h1>Escolha como usar o <em>{product === 'issuer' ? 'Emissor' : 'Extrator'} WS.</em></h1>
        <p>Você confere o plano aqui e cadastra o pagamento diretamente no Mercado Pago. A WS não armazena os dados do seu cartão.</p>
        {status && <div className={`billing-return is-${status}`} role="status">{status === 'success' ? 'Pagamento recebido. Estamos confirmando sua liberação.' : status === 'pending' ? 'O pagamento está em análise. A liberação acontece automaticamente após a aprovação.' : status === 'return' ? 'Cadastro do pagamento concluído. A confirmação será atualizada automaticamente.' : 'O pagamento não foi concluído. Você pode tentar novamente.'}</div>}
        <div className="billing-product-tabs" aria-label="Produto">
          <button className={product === 'issuer' ? 'active' : ''} onClick={() => changeProduct('issuer')}>Emissor Fiscal</button>
          <button className={product === 'extractor' ? 'active' : ''} onClick={() => changeProduct('extractor')}>Extrator Fiscal</button>
        </div>
        <div className="billing-plan-list">{productPlans.map(([code, plan]) => <button key={code} className={planCode === code ? 'active' : ''} onClick={() => setPlanCode(code)}><span><b>{plan.label}</b><small>{plan.description}</small></span><strong>R$ {plan.price}<small>/mês</small></strong></button>)}</div>
      </div>

      <aside className="billing-summary">
        <span>RESUMO DA CONTRATAÇÃO</span><h2>{selected.label}</h2>
        <div className="billing-mode">
          <button className={billingMode === 'recurring' ? 'active' : ''} onClick={() => setBillingMode('recurring')}><CreditCard /><span><b>Assinatura mensal</b><small>7 dias grátis e renovação automática</small></span></button>
          <button className={billingMode === 'one_time' ? 'active' : ''} onClick={() => setBillingMode('one_time')}><span className="billing-calendar">30</span><span><b>Comprar somente 30 dias</b><small>Pagamento agora, sem renovação</small></span></button>
        </div>
        <ul>{selected.details.map(item => <li key={item}><Check /> {item}</li>)}</ul>
        <div className="billing-total"><span>{billingMode === 'recurring' ? 'Hoje' : 'Total hoje'}</span><strong>{billingMode === 'recurring' ? 'R$ 0' : `R$ ${selected.price}`}</strong></div>
        {billingMode === 'recurring' && <p className="billing-trial-note">Depois dos 7 dias, R$ {selected.price}/mês. Se este produto já teve teste grátis nesta conta, a cobrança começa imediatamente.</p>}
        <label className="billing-terms"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /><span>Li e aceito os <Link to="/termos-de-servico" target="_blank">Termos de Serviço</Link> e a <Link to="/politica-de-privacidade" target="_blank">Política de Privacidade</Link>.</span></label>
        {error && <div className="billing-error" role="alert">{error}</div>}
        <button className="billing-submit" disabled={!accepted || loading} onClick={() => void startCheckout()}>{loading ? 'Preparando checkout...' : billingMode === 'recurring' ? 'Cadastrar pagamento e testar grátis' : 'Pagar e liberar 30 dias'} {!loading && <ArrowRight />}</button>
        <small className="billing-provider">Pagamento processado pelo Mercado Pago</small>
      </aside>
    </section>
  </main>;
}
