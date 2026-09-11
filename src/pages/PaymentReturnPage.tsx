import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AppLoadingScreen from '@/components/AppLoadingScreen';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentProductAccess } from '@/utils/auth/productAccess';
import '@/styles/payment-return.css';

const LOGO = '/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png';

export default function PaymentReturnPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [retryKey, setRetryKey] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const product = params.get('product') === 'extractor' ? 'extractor' : 'issuer';
  const status = params.get('status') || 'pending';
  const paymentId = params.get('payment_id') || params.get('collection_id') || '';
  const preapprovalId = params.get('preapproval_id') || '';
  const destination = product === 'extractor' ? '/extrator' : '/app';

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;
    setTimedOut(false);

    const check = async () => {
      await supabase.functions.invoke('mp-reconcile-checkout', {
        body: { product, paymentId: paymentId || undefined, preapprovalId: preapprovalId || undefined },
      });
      const access = await getCurrentProductAccess();
      const ready = product === 'extractor' ? access.extractor : access.saas;
      if (!cancelled && ready) {
        navigate(destination, { replace: true });
        return;
      }
      attempts += 1;
      if (cancelled) return;
      if (attempts < 12) timer = window.setTimeout(() => void check(), 2500);
      else setTimedOut(true);
    };

    void check();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [destination, navigate, paymentId, preapprovalId, product, retryKey, user]);

  if (isLoading) return <AppLoadingScreen mode="light" />;
  if (!user) return <Navigate to="/login" replace />;

  const failed = status === 'failure';
  return (
    <main className="payment-return-page">
      <div className="payment-return-grid" aria-hidden="true" />
      <span className="payment-return-light light-one" aria-hidden="true" />
      <span className="payment-return-light light-two" aria-hidden="true" />
      <span className="payment-return-ring ring-one" aria-hidden="true" />
      <span className="payment-return-ring ring-two" aria-hidden="true" />

      <header className="payment-return-header">
        <img src={LOGO} alt="WS Gestão Contábil" />
        <span><ShieldCheck /> Ambiente protegido</span>
      </header>

      <section className="payment-return-card">
        <div className={`payment-return-icon ${failed ? 'is-failed' : ''}`}>
          {failed ? <RefreshCw /> : timedOut ? <CheckCircle2 /> : <LoaderCircle className="is-spinning" />}
        </div>
        <span className="payment-return-kicker">
          {failed ? 'PAGAMENTO NÃO CONCLUÍDO' : 'PAGAMENTO RECEBIDO'}
        </span>
        <h1>
          {failed
            ? 'A contratação não foi finalizada.'
            : timedOut
              ? 'A confirmação está levando mais tempo.'
              : 'Estamos liberando seu acesso.'}
        </h1>
        <p>
          {failed
            ? 'Você pode voltar ao checkout e tentar novamente. Nenhum acesso será ativado sem a confirmação do Mercado Pago.'
            : timedOut
              ? 'O Mercado Pago recebeu a operação, mas a confirmação ainda não chegou. Você pode verificar novamente sem fazer outro pagamento.'
              : `Estamos validando a contratação do ${product === 'extractor' ? 'Extrator Fiscal' : 'Emissor Fiscal'} e você será direcionado automaticamente.`}
        </p>

        {!failed && !timedOut && (
          <div className="payment-return-progress" aria-label="Confirmação em andamento"><span /></div>
        )}

        <div className="payment-return-actions">
          {timedOut && (
            <button type="button" onClick={() => setRetryKey(value => value + 1)}>
              Verificar novamente <RefreshCw />
            </button>
          )}
          {failed && (
            <button type="button" onClick={() => navigate(product === 'extractor' ? '/assinar/extrator' : '/assinar/emissor')}>
              Voltar ao checkout <ArrowRight />
            </button>
          )}
        </div>

        <small><ShieldCheck /> A confirmação é consultada diretamente no Mercado Pago.</small>
      </section>
    </main>
  );
}
