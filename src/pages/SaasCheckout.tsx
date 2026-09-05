import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AppLoadingScreen from '@/components/AppLoadingScreen';
import '@/styles/saas-checkout.css';

type CheckoutInvoice = {
  id: string;
  invoice_number: number | null;
  organization_id: string;
  description: string;
  line_items: Array<{ description?: string; quantity?: number; unit_amount_cents?: number }> | null;
  period_start: string;
  period_end: string;
  due_date: string | null;
  subtotal_cents: number | null;
  discount_cents: number;
  total_cents: number | null;
  status: string;
};

type PaymentMethod = 'pix' | 'card' | 'boleto';
type QueryError = { message: string } | null;
type InvoiceQueryResult = PromiseLike<{ data: CheckoutInvoice | null; error: QueryError }>;
type OrganizationQueryResult = PromiseLike<{ data: { name: string } | null; error: QueryError }>;

type CheckoutDatabaseClient = {
  from(table: 'saas_invoices'): {
    select(columns: string): {
      eq(column: string, value: string): { maybeSingle(): InvoiceQueryResult };
    };
  };
  from(table: 'organizations'): {
    select(columns: string): {
      eq(column: string, value: string): { maybeSingle(): OrganizationQueryResult };
    };
  };
};

const WS_LOGO = '/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png';
const checkoutDb = supabase as unknown as CheckoutDatabaseClient;

export default function SaasCheckout() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<CheckoutInvoice | null>(null);
  const [organizationName, setOrganizationName] = useState('Sua empresa');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadInvoice = async () => {
      if (!invoiceId) {
        setError('Fatura não informada.');
        setLoading(false);
        return;
      }

      const { data, error: invoiceError } = await checkoutDb
        .from('saas_invoices')
        .select('id,invoice_number,organization_id,description,line_items,period_start,period_end,due_date,subtotal_cents,discount_cents,total_cents,status')
        .eq('id', invoiceId)
        .maybeSingle();

      if (cancelled) return;
      if (invoiceError || !data) {
        setError('Não foi possível localizar esta fatura para a sua empresa.');
        setLoading(false);
        return;
      }

      setInvoice(data as CheckoutInvoice);

      const { data: organization } = await checkoutDb
        .from('organizations')
        .select('name')
        .eq('id', data.organization_id)
        .maybeSingle();

      if (cancelled) return;
      if (organization?.name) setOrganizationName(organization.name);
      setLoading(false);
    };

    void loadInvoice();
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  const invoiceCode = String(invoice?.invoice_number ?? '').padStart(6, '0') || '—';

  if (loading) return <AppLoadingScreen mode="light" />;

  if (error || !invoice) {
    return (
      <main className="saas-checkout-error">
        <img src={WS_LOGO} alt="WS Gestão Contábil" />
        <section>
          <span>Checkout</span>
          <h1>Fatura indisponível</h1>
          <p>{error || 'Não foi possível carregar os dados desta cobrança.'}</p>
          <button type="button" onClick={() => navigate('/app')}>Voltar ao emissor fiscal</button>
        </section>
      </main>
    );
  }

  const payable = ['open', 'overdue'].includes(invoice.status);
  const subtotal = invoice.subtotal_cents ?? invoice.total_cents ?? 0;
  const discount = invoice.discount_cents ?? 0;
  const total = invoice.total_cents ?? Math.max(0, subtotal - discount);

  return (
    <div className="saas-checkout-page">
      <header className="saas-checkout-topbar">
        <div className="saas-checkout-owner">
          <button type="button" className="saas-checkout-brand" onClick={() => navigate('/app')}>
            <img src={WS_LOGO} alt="WS Gestão Contábil" />
          </button>
          <div>
            <strong>Checkout seguro</strong>
            <span>Ambiente protegido da WS Gestão Contábil</span>
          </div>
        </div>
        <div className="saas-checkout-mercado-pago">
          <span>O pagamento será processado por</span>
          <MercadoPagoLogo />
        </div>
      </header>

      <main className="saas-checkout-main">
        <button type="button" className="saas-checkout-back" onClick={() => navigate('/app')}>
          ← Voltar para minhas faturas
        </button>

        <div className="saas-checkout-heading">
          <span>Pagamento da assinatura</span>
          <h1>Finalizar pagamento</h1>
          <p>Confira os dados da cobrança e escolha como deseja pagar.</p>
        </div>

        <div className="saas-checkout-layout">
          <section className="saas-checkout-card saas-checkout-payment">
            <div className="saas-checkout-section-head">
              <span>Forma de pagamento</span>
              <h2>Como você prefere pagar?</h2>
            </div>

            {payable ? (
              <>
                <div className="saas-checkout-methods" role="radiogroup" aria-label="Forma de pagamento">
                  <PaymentMethodOption
                    method="pix"
                    current={paymentMethod}
                    title="PIX"
                    subtitle="Aprovação rápida"
                    icon={<PixIcon />}
                    onSelect={setPaymentMethod}
                  />
                  <PaymentMethodOption
                    method="card"
                    current={paymentMethod}
                    title="Cartão de crédito"
                    subtitle="Pagamento online"
                    icon={<CardBrands />}
                    onSelect={setPaymentMethod}
                  />
                  <PaymentMethodOption
                    method="boleto"
                    current={paymentMethod}
                    title="Boleto"
                    subtitle="Pagamento após compensação"
                    icon={<BoletoIcon />}
                    onSelect={setPaymentMethod}
                  />
                </div>

                <div className="saas-checkout-method-detail">
                  <span>{paymentDetails[paymentMethod].eyebrow}</span>
                  <h3>{paymentDetails[paymentMethod].title}</h3>
                  <p>{paymentDetails[paymentMethod].description}</p>
                </div>

                <label className="saas-checkout-legal-acceptance">
                  <input
                    type="checkbox"
                    checked={legalAccepted}
                    onChange={(event) => setLegalAccepted(event.target.checked)}
                  />
                  <span>
                    Li e concordo com os <Link to="/termos-de-servico" target="_blank" rel="noopener noreferrer">Termos de Serviço</Link> e declaro ciência da{' '}
                    <Link to="/politica-de-privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</Link>.
                  </span>
                </label>

                <button type="button" className="saas-checkout-submit" disabled>
                  {paymentDetails[paymentMethod].buttonLabel}
                </button>
                <p className="saas-checkout-provider-note">
                  Integração com o Mercado Pago em preparação. Nenhuma cobrança será feita nesta demonstração.
                </p>
              </>
            ) : (
              <div className="saas-checkout-state">
                <span>{invoice.status === 'paid' ? 'Pagamento concluído' : 'Cobrança encerrada'}</span>
                <h3>{invoice.status === 'paid' ? 'Esta fatura já está paga.' : 'Esta fatura não está disponível para pagamento.'}</h3>
                <button type="button" onClick={() => navigate('/app')}>Voltar ao emissor fiscal</button>
              </div>
            )}
          </section>

          <aside className="saas-checkout-card saas-checkout-summary">
            <div className="saas-checkout-section-head">
              <span>Resumo da cobrança</span>
              <h2>Fatura #{invoiceCode}</h2>
            </div>

            <div className="saas-checkout-company">
              <span>Empresa</span>
              <strong>{organizationName}</strong>
            </div>

            <div className="saas-checkout-description">
              <strong>{invoice.description || 'Assinatura do emissor fiscal'}</strong>
              <span>Período de {formatDate(invoice.period_start)} a {formatDate(invoice.period_end)}</span>
              <span>Vencimento: {invoice.due_date ? formatDate(invoice.due_date) : 'não informado'}</span>
            </div>

            <dl className="saas-checkout-totals">
              <div><dt>Subtotal</dt><dd>{formatMoney(subtotal)}</dd></div>
              {discount > 0 && <div><dt>Desconto</dt><dd>− {formatMoney(discount)}</dd></div>}
              <div className="is-total"><dt>Total</dt><dd>{formatMoney(total)}</dd></div>
            </dl>

            <div className="saas-checkout-security">
              <strong>Pagamento protegido</strong>
              <span>Seus dados financeiros não ficam armazenados no emissor fiscal.</span>
            </div>
          </aside>
        </div>
      </main>

      <footer className="saas-checkout-footer">
        <span>© 2026 WS Gestão Contábil</span>
        <nav aria-label="Documentos legais">
          <Link to="/termos-de-servico">Termos de Serviço</Link>
          <Link to="/politica-de-privacidade">Política de Privacidade</Link>
        </nav>
      </footer>
    </div>
  );
}

const paymentDetails: Record<PaymentMethod, { eyebrow: string; title: string; description: string; buttonLabel: string }> = {
  pix: {
    eyebrow: 'Pagamento por PIX',
    title: 'Pague pelo aplicativo do seu banco',
    description: 'Na próxima etapa, o Mercado Pago exibirá o QR Code e o código copia e cola. A confirmação costuma acontecer em poucos instantes.',
    buttonLabel: 'Continuar com PIX',
  },
  card: {
    eyebrow: 'Pagamento por cartão',
    title: 'Use seu cartão de crédito',
    description: 'Os dados do cartão serão informados e processados com segurança no ambiente do Mercado Pago.',
    buttonLabel: 'Continuar com cartão',
  },
  boleto: {
    eyebrow: 'Pagamento por boleto',
    title: 'Gere o boleto para pagamento',
    description: 'O Mercado Pago emitirá o boleto na próxima etapa. A fatura será confirmada somente após a compensação bancária.',
    buttonLabel: 'Gerar boleto',
  },
};

function PaymentMethodOption({
  method,
  current,
  title,
  subtitle,
  icon,
  onSelect,
}: {
  method: PaymentMethod;
  current: PaymentMethod;
  title: string;
  subtitle: string;
  icon: ReactNode;
  onSelect: (method: PaymentMethod) => void;
}) {
  const active = current === method;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      className={active ? 'is-active' : ''}
      onClick={() => onSelect(method)}
    >
      <span className="saas-checkout-method-copy">
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
      <span className="saas-checkout-method-icon" aria-hidden="true">{icon}</span>
      <span className="saas-checkout-method-chevron" aria-hidden="true">⌄</span>
    </button>
  );
}

function MercadoPagoLogo() {
  return (
    <span className="saas-checkout-mp-logo" aria-label="Mercado Pago">
      <span className="saas-checkout-mp-mark" aria-hidden="true">
        <svg viewBox="0 0 44 28" role="img">
          <path d="M13.1 8.4c2.6-2.6 5.4-2.3 8.3.5l1.4 1.3 1.7-1.6c2.5-2.3 5-2.5 7.3-.4 1.7 1.5 2 3.7.9 5.8l-1 1.7-6.5 5.7c-1.5 1.3-3.7 1.4-5.2.1l-2-1.7-1.2.9c-1.4 1.1-3.4.9-4.6-.4-1-1.1-1.2-2.7-.5-4l-1.2-1.1c-1.9-1.8-2-4.7-.2-6.6.8-.9 1.8-1.4 2.8-1.6Z" />
          <path d="M4.2 6.5c4.9-4.9 12.8-5 17.8-.2 5-4.8 12.9-4.7 17.8.2 5 5 5 13.1 0 18.1-1.8 1.8-4 2.9-6.4 3.4l-2.1-3.2c2-.3 3.9-1.2 5.4-2.7 3.6-3.6 3.6-9.5 0-13.1-3.6-3.6-9.5-3.6-13.1 0l-1.5 1.5L20.5 9c-3.6-3.6-9.5-3.6-13.1 0-3.6 3.6-3.6 9.5 0 13.1 1.6 1.6 3.6 2.5 5.6 2.7L10.9 28c-2.5-.5-4.8-1.6-6.7-3.4-5-5-5-13.1 0-18.1Z" />
        </svg>
      </span>
      <strong>mercado pago</strong>
    </span>
  );
}

function PixIcon() {
  return (
    <span className="saas-checkout-pix-icon">
      <svg viewBox="0 0 24 24" role="img">
        <path d="m12 2.7 4.1 4.1a2.8 2.8 0 0 0 2 .8h1.1l2.1 2.1a3.2 3.2 0 0 1 0 4.6l-2.1 2.1h-1.1a2.8 2.8 0 0 0-2 .8L12 21.3l-4.1-4.1a2.8 2.8 0 0 0-2-.8H4.8l-2.1-2.1a3.2 3.2 0 0 1 0-4.6l2.1-2.1h1.1a2.8 2.8 0 0 0 2-.8L12 2.7Zm0 4.1L8.7 10a4.6 4.6 0 0 1-2.9 1.3H5l-.7.7.7.7h.8c1.2 0 2.2.5 3 1.3l3.2 3.2 3.3-3.2a4.6 4.6 0 0 1 2.9-1.3h.8l.7-.7-.7-.7h-.8c-1.2 0-2.2-.5-3-1.3L12 6.8Z" />
      </svg>
      <strong>pix</strong>
    </span>
  );
}

function CardBrands() {
  return (
    <span className="saas-checkout-card-brands" aria-label="Visa, Mastercard, American Express, Elo e Hipercard">
      <span className="brand-visa">VISA</span>
      <span className="brand-master"><i /><i /></span>
      <span className="brand-amex">AMEX</span>
      <span className="brand-elo">elo</span>
      <span className="brand-hiper">hiper</span>
    </span>
  );
}

function BoletoIcon() {
  return (
    <span className="saas-checkout-boleto-icon">
      <svg viewBox="0 0 42 24" role="img">
        <path d="M2 3h2v18H2V3Zm4 0h1v18H6V3Zm3 0h3v18H9V3Zm5 0h1v18h-1V3Zm3 0h2v18h-2V3Zm4 0h1v18h-1V3Zm3 0h3v18h-3V3Zm5 0h1v18h-1V3Zm3 0h2v18h-2V3Zm4 0h1v18h-1V3Zm3 0h2v18h-2V3Z" />
      </svg>
      <strong>Boleto</strong>
    </span>
  );
}

function formatDate(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR').format(date);
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}
