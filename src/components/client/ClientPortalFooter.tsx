import { Link } from "react-router-dom";

export function ClientPortalFooter() {
  return (
    <footer className="client-portal-footer">
      <div>
        <span>© 2026 WS Gestão Contábil</span>
        <span>Portal do cliente</span>
      </div>
      <nav aria-label="Links legais">
        <Link to="/termos-de-servico">Termos de Uso</Link>
        <Link to="/politica-de-cookies">Cookies</Link>
        <Link to="/politica-de-privacidade">Privacidade</Link>
      </nav>
    </footer>
  );
}
