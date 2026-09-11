import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CreditCard, LockKeyhole, RefreshCw } from 'lucide-react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import '@/styles/billing-onboarding.css';

type Product = 'issuer' | 'extractor';
type BillingMode = 'recurring' | 'one_time';
type PlanCode = 'issuer_monthly' | 'extractor_commercial' | 'extractor_enterprise';
type Plan = {
  product: Product;
  label: string;
  price: number;
  description: string;
  details: string[];
};

const planCatalog: Record<PlanCode, Plan> = {
  issuer_monthly: {
    product: 'issuer',
    label: 'Emissor Fiscal WS',
    price: 69,
    description: 'Emissões sem limite de quantidade.',
    details: [
      'NF-e, NFC-e, NFS-e, CT-e e MDF-e',
      'Cadastros, produtos e histórico em um só lugar',
      'Suporte direto da equipe WS',
    ],
  },
  extractor_commercial: {
    product: 'extractor',
    label: 'Extrator Comercial',
    price: 99,
    description: 'Para carteiras de até 20 mil XML por mês.',
    details: [
      'Compras e vendas organizadas por CNPJ',
      'Até 20.000 XML por mês',
      'Download dos arquivos para a rotina contábil',
    ],
  },
  extractor_enterprise: {
    product: 'extractor',
    label: 'Extrator Empresarial',
    price: 250,
    description: 'Para escritórios com alto volume de documentos.',
    details: [
      'Empresas e XML sem limite',
      'Compras e vendas organizadas por CNPJ',
      'Download dos arquivos para a rotina contábil',
    ],
  },
};

const productContent = {
  issuer: {
    name: 'Emissor Fiscal WS',
    shortName: 'Emissor',
    back: '/emissor-fiscal',
    destination: '/app',
    title: 'Comece a emitir com segurança.',
    description:
      'Cadastre a forma de pagamento e use o Emissor por 7 dias. Você só será cobrado depois do período gratuito.',
    context: 'Você está contratando apenas o Emissor Fiscal WS.',
  },
  extractor: {
    name: 'Extrator Fiscal WS',
    shortName: 'Extrator',
    back: '/extrator-fiscal',
    destination: '/extrator',
    title: 'Pare de esperar as notas dos clientes.',
    description:
      'Escolha o volume da sua carteira e teste por 7 dias. Compras e vendas ficam disponíveis e organizadas por empresa.',
    context: 'Você está contratando apenas o Extrator Fiscal WS.',
  },
} as const;

export function LegacyBillingRedirect() {
  const [params] = useSearchParams();
  const product = params.get('product') === 'extractor' ? 'extrator' : 'emissor';
  const next = new URLSearchParams(params);
  next.delete('product');
  const query = next.toString();
  return <Navigate to={`/assinar/${product}${query ? `?${query}` : ''}`} replace />;
}

export default function BillingOnboardingPage({ product }: { product: Product }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const requestedPlan = params.get('plan') as PlanCode | null;
  const fallbackPlan: PlanCode = product === 'issuer' ? 'issuer_monthly' : 'extractor_commercial';
  const initialPlan =
    requestedPlan && planCatalog[requestedPlan]?.product === product ? requestedPlan : fallbackPlan;
  const [planCode, setPlanCode] = useState<PlanCode>(initialPlan);
  const [billingMode, setBillingMode] = useState<BillingMode>('recurring');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const selected = planCatalog[planCode];
  const content = productContent[product];
  const status = params.get('status');
  const productPlans = Object.entries(planCatalog).filter(
    ([, plan]) => plan.product === product
  ) as [PlanCode, Plan][];

  useEffect(() => {
    setPlanCode(initialPlan);
    setBillingMode('recurring');
    setAccepted(false);
    setError('');
  }, [initialPlan, product]);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `Contratar ${content.name} | WS Gestão Contábil`;
  }, [content.name]);

  useEffect(() => {
    if (!status || !['success', 'pending', 'return'].includes(status)) return;
    let cancelled = false;
    let attempts = 0;
    const checkAccess = async () => {
      const { data } = await (supabase as any)
        .from('saas_subscriptions')
        .select('status,product_code,trial_ends_at,access_expires_at')
        .eq('product_code', product)
        .in('status', ['trialing', 'active'])
        .order('created_at', { ascending: false })
        .limit(1);
      const subscription = data?.[0];
      const boundary =
        subscription?.status === 'trialing'
          ? subscription?.trial_ends_at
          : subscription?.access_expires_at;
      if (!cancelled && subscription && (!boundary || new Date(boundary).getTime() > Date.now())) {
        navigate(content.destination, { replace: true });
        return;
      }
      attempts += 1;
      if (!cancelled && attempts < 10) window.setTimeout(() => void checkAccess(), 2000);
    };
    void checkAccess();
    return () => {
      cancelled = true;
    };
  }, [content.destination, navigate, product, status]);

  const startCheckout = async () => {
    setError('');
    setLoading(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('mp-start-checkout', {
        body: { planCode, billingMode, termsAccepted: accepted },
      });
      let responseMessage = typeof data?.error === 'string' ? data.error : '';
      const response = (invokeError as { context?: Response } | null)?.context;
      if (!responseMessage && response instanceof Response) {
        const payload = (await response
          .clone()
          .json()
          .catch(() => null)) as { error?: string } | null;
        responseMessage = typeof payload?.error === 'string' ? payload.error : '';
      }
      if (invokeError || responseMessage)
        throw new Error(responseMessage || 'checkout_unavailable');
      if (!data?.checkoutUrl) throw new Error('checkout_unavailable');
      window.location.assign(data.checkoutUrl);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      setError(friendlyCheckoutError(message));
      setLoading(false);
    }
  };

  const totalToday = billingMode === 'recurring' ? 0 : selected.price;

  return (
    <main className={`billing-page billing-${product}`}>
      <header className="billing-header">
        <Link to={content.back}>
          <ArrowLeft /> Voltar ao {content.shortName}
        </Link>
        <img
          src="/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png"
          alt="WS Gestão Contábil"
        />
        <span>
          <LockKeyhole /> Pagamento seguro
        </span>
      </header>

      <div className="billing-product-ribbon">
        <div className="billing-product-switch">
          <small>Alterar para:</small>
          <Link
            to={
              product === 'issuer'
                ? '/assinar/extrator?plan=extractor_commercial'
                : '/assinar/emissor?plan=issuer_monthly'
            }
          >
            {product === 'issuer' ? 'Extrator Fiscal WS' : 'Emissor Fiscal WS'}
          </Link>
        </div>
        <small>{content.context}</small>
      </div>

      <section className="billing-shell">
        <div className="billing-copy">
          <header className="billing-title">
            <span>Contratação</span>
            <h1>{content.title}</h1>
            <p>{content.description}</p>
          </header>

          {status ? <CheckoutReturn status={status} /> : null}

          <section className="billing-step" aria-labelledby="billing-plan-title">
            <div className="billing-step-number">1</div>
            <div className="billing-step-body">
              <h2 id="billing-plan-title">
                {product === 'issuer' ? 'Seu acesso' : 'Escolha o plano'}
              </h2>
              <p>
                {product === 'issuer'
                  ? 'Um único plano, sem limite de emissões.'
                  : 'Você pode mudar de plano depois, conforme sua carteira crescer.'}
              </p>
              <div className={`billing-plan-list ${product === 'issuer' ? 'is-single' : ''}`}>
                {productPlans.map(([code, plan]) => (
                  <button
                    type="button"
                    key={code}
                    aria-pressed={planCode === code}
                    className={planCode === code ? 'active' : ''}
                    onClick={() => setPlanCode(code)}
                  >
                    <span>
                      <b>{plan.label}</b>
                      <small>{plan.description}</small>
                    </span>
                    <strong
                      className={billingMode === 'recurring' ? 'billing-promotional-price' : ''}
                    >
                      {billingMode === 'recurring' ? (
                        <>
                          <del>R$ {plan.price}</del>
                          <span>R$ 0 hoje</span>
                          <small>7 dias grátis</small>
                        </>
                      ) : (
                        <>
                          R$ {plan.price}
                          <small>/30 dias</small>
                        </>
                      )}
                    </strong>
                    <i aria-hidden="true">
                      <Check />
                    </i>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="billing-step" aria-labelledby="billing-mode-title">
            <div className="billing-step-number">2</div>
            <div className="billing-step-body">
              <h2 id="billing-mode-title">Escolha a forma de contratação</h2>
              <p>Renove automaticamente ou compre apenas 30 dias de acesso.</p>
              <div className="billing-mode">
                <button
                  type="button"
                  aria-pressed={billingMode === 'recurring'}
                  className={billingMode === 'recurring' ? 'active' : ''}
                  onClick={() => setBillingMode('recurring')}
                >
                  <span className="billing-choice-icon">
                    <RefreshCw />
                  </span>
                  <span>
                    <b>Assinatura mensal</b>
                    <small>7 dias grátis, depois R$ {selected.price}/mês</small>
                  </span>
                  <i aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-pressed={billingMode === 'one_time'}
                  className={billingMode === 'one_time' ? 'active' : ''}
                  onClick={() => setBillingMode('one_time')}
                >
                  <span className="billing-choice-icon">
                    <CreditCard />
                  </span>
                  <span>
                    <b>Acesso por 30 dias</b>
                    <small>R$ {selected.price} agora, sem renovação automática</small>
                  </span>
                  <i aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="billing-summary">
          <header>
            <span>Resumo</span>
            <h2>{selected.label}</h2>
          </header>
          <ul>
            {selected.details.map(item => (
              <li key={item}>
                <Check /> <span>{item}</span>
              </li>
            ))}
          </ul>
          <dl>
            {billingMode === 'recurring' ? (
              <>
                <div>
                  <dt>Valor do plano</dt>
                  <dd className="billing-old-price">R$ {selected.price}</dd>
                </div>
                <div className="billing-discount">
                  <dt>Desconto nos primeiros 7 dias</dt>
                  <dd>− R$ {selected.price}</dd>
                </div>
              </>
            ) : null}
            <div>
              <dt>{billingMode === 'recurring' ? 'Primeiros 7 dias' : 'Período contratado'}</dt>
              <dd>{billingMode === 'recurring' ? 'Grátis' : '30 dias'}</dd>
            </div>
            <div>
              <dt>{billingMode === 'recurring' ? 'Depois do teste' : 'Renovação'}</dt>
              <dd>{billingMode === 'recurring' ? `R$ ${selected.price}/mês` : 'Não automática'}</dd>
            </div>
            <div className="billing-total">
              <dt>Total hoje</dt>
              <dd>R$ {totalToday}</dd>
            </div>
          </dl>
          {billingMode === 'recurring' ? (
            <p className="billing-trial-note">
              <strong>Nenhuma cobrança hoje.</strong> O cartão é cadastrado no Mercado Pago para
              validar a forma de pagamento. A renovação automática de R$ {selected.price}/mês começa
              após os 7 dias gratuitos e pode ser cancelada antes da cobrança.
            </p>
          ) : null}
          <label className="billing-terms">
            <input
              type="checkbox"
              checked={accepted}
              onChange={event => setAccepted(event.target.checked)}
            />
            <span>
              Li e aceito os{' '}
              <Link to="/termos-de-servico" target="_blank">
                Termos de Serviço
              </Link>{' '}
              e a{' '}
              <Link to="/politica-de-privacidade" target="_blank">
                Política de Privacidade
              </Link>
              {billingMode === 'recurring'
                ? ', autorizando a renovação automática após o teste grátis'
                : ''}
              .
            </span>
          </label>
          {error ? (
            <div className="billing-error" role="alert">
              <strong>Não foi possível continuar</strong>
              <span>{error}</span>
            </div>
          ) : null}
          <button
            type="button"
            className="billing-submit"
            disabled={!accepted || loading}
            onClick={() => void startCheckout()}
          >
            {loading
              ? 'Abrindo o Mercado Pago...'
              : billingMode === 'recurring'
                ? 'Cadastrar cartão e iniciar teste'
                : 'Comprar 30 dias'}
            {loading ? null : <ArrowRight />}
          </button>
          <small className="billing-provider">
            <LockKeyhole /> Seus dados de pagamento ficam no Mercado Pago
          </small>
        </aside>
      </section>
    </main>
  );
}

function CheckoutReturn({ status }: { status: string }) {
  const message =
    status === 'success'
      ? 'Pagamento recebido. Estamos confirmando a liberação do acesso.'
      : status === 'pending'
        ? 'O pagamento está em análise. A liberação acontece automaticamente após a aprovação.'
        : status === 'return'
          ? 'Forma de pagamento cadastrada. Estamos aguardando a confirmação do Mercado Pago.'
          : 'O pagamento não foi concluído. Você pode tentar novamente.';
  return (
    <div className={`billing-return is-${status}`} role="status">
      {message}
    </div>
  );
}

function friendlyCheckoutError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes('já possui acesso')) return message;
  if (normalized.includes('muitas tentativas')) return message;
  if (normalized.includes('mercado pago ainda não foi configurado'))
    return 'O pagamento está temporariamente indisponível. Fale com a equipe WS.';
  return 'O Mercado Pago não abriu o pagamento. Aguarde um instante e tente novamente. Se o erro continuar, fale com a equipe WS.';
}
