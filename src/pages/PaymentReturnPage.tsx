import { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppLoadingScreen from '@/components/AppLoadingScreen';
import { getCurrentProductAccess } from '@/utils/auth/productAccess';

export default function PaymentReturnPage() {
  const { user, isLoading } = useAuth();
  const [params] = useSearchParams();
  const product = params.get('product') === 'extractor' ? 'extractor' : 'issuer';
  const status = params.get('status') || 'pending';

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let attempts = 0;
    const check = async () => {
      const access = await getCurrentProductAccess();
      const ready = product === 'extractor' ? access.extractor : access.saas;
      if (!cancelled && ready) {
        window.location.replace(product === 'extractor' ? '/extrator' : '/app');
        return;
      }
      attempts += 1;
      if (!cancelled && attempts < 15) window.setTimeout(() => void check(), 2000);
    };
    void check();
    return () => { cancelled = true; };
  }, [product, user]);

  if (isLoading) return <AppLoadingScreen mode="light" />;
  if (!user) return <Navigate to="/login" replace />;
  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, color: '#0b1729', background: '#f7f8fa', textAlign: 'center' }}>
    <section><p style={{ fontWeight: 700 }}>Pagamento {status === 'success' ? 'recebido' : 'em processamento'}</p><h1 style={{ margin: '12px 0', fontSize: 'clamp(24px, 4vw, 40px)' }}>Estamos confirmando seu acesso.</h1><span>Assim que o Mercado Pago confirmar, você será direcionado automaticamente.</span></section>
  </main>;
}
