import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'ws_cookie_consent';
type Consent = 'essential' | 'all';

const PublicCookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(!window.localStorage.getItem(STORAGE_KEY));
    } catch {
      setVisible(true);
    }
  }, []);

  const choose = (consent: Consent) => {
    try { window.localStorage.setItem(STORAGE_KEY, consent); } catch { /* browser storage may be disabled */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside className="public-cookie" role="dialog" aria-live="polite" aria-label="Preferências de cookies">
      <div>
        <strong>Sua privacidade vem antes da medição.</strong>
        <p>Usamos recursos essenciais para sessão, segurança e preferências. Recursos opcionais de análise só devem ser ativados com sua escolha.</p>
        <Link to="/politica-de-privacidade">Entender como a WS trata dados</Link>
      </div>
      <div className="public-cookie-actions">
        <button type="button" onClick={() => choose('essential')}>Somente essenciais</button>
        <button type="button" className="is-primary" onClick={() => choose('all')}>Aceitar todos</button>
      </div>
    </aside>
  );
};

export default PublicCookieConsent;
