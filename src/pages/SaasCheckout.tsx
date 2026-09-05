import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

type PaymentMethod = 'pix' | 'card';
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

  const invoiceCode = useMemo(
    () => String(invoice?.invoice_number ?? '').padStart(6, '0') || '—',
    [invoice?.invoice_number],
  );

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
        <button type="button" className="saas-checkout-brand" onClick={() => navigate('/app')}>
          <img src={WS_LOGO} alt="WS Gestão Contábil" />
        </button>
        <div>
          <strong>Checkout seguro</strong>
          <span>Ambiente protegido da WS Gestão Contábil</span>
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
                  <button
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === 'pix'}
                    className={paymentMethod === 'pix' ? 'is-active' : ''}
                    onClick={() => setPaymentMethod('pix')}
                  >
                    <strong>PIX</strong>
                    <span>Aprovação rápida</span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === 'card'}
                    className={paymentMethod === 'card' ? 'is-active' : ''}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <strong>Cartão de crédito</strong>
                    <span>Pagamento online</span>
                  </button>
                </div>

                <div className="saas-checkout-method-detail">
                  <span>{paymentMethod === 'pix' ? 'Pagamento por PIX' : 'Pagamento por cartão'}</span>
                  <h3>{paymentMethod === 'pix' ? 'Pague pelo aplicativo do seu banco' : 'Use seu cartão de crédito'}</h3>
                  <p>
                    {paymentMethod === 'pix'
                      ? 'O código e o QR Code serão gerados pela plataforma de pagamento na próxima etapa.'
                      : 'Os dados do cartão serão processados com segurança pela plataforma de pagamento.'}
                  </p>
                </div>

                <button type="button" className="saas-checkout-submit" disabled>
                  Conectar plataforma de pagamento para continuar
                </button>
                <p className="saas-checkout-provider-note">
                  Esta tela já está preparada para receber a integração do provedor. Nenhuma cobrança será feita nesta demonstração.
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
    </div>
  );
}

function formatDate(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR').format(date);
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}
