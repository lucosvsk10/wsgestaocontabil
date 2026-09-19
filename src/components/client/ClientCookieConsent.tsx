import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const KEY = "ws_cookie_consent_v1";

export function ClientCookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(!window.localStorage.getItem(KEY));
    } catch {
      setVisible(true);
    }
  }, []);

  const choose = (value: "all" | "essential") => {
    try {
      window.localStorage.setItem(KEY, value);
      window.dispatchEvent(new CustomEvent("ws-cookie-consent", { detail: value }));
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="client-cookie-consent" role="dialog" aria-live="polite" aria-label="Preferências de cookies">
      <div className="client-cookie-consent-copy">
        <strong>Cookies e armazenamento local</strong>
        <p>
          Usamos recursos essenciais para manter sua sessão, segurança e preferências do portal.
          Você pode permitir também recursos opcionais quando estiverem disponíveis.
        </p>
        <Link to="/politica-de-cookies">Ver política de cookies</Link>
      </div>
      <div className="client-cookie-consent-actions">
        <button className="is-secondary" onClick={() => choose("essential")}>Somente essenciais</button>
        <button className="is-primary" onClick={() => choose("all")}>Aceitar todos</button>
      </div>
    </div>
  );
}
