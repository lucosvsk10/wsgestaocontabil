import { Instagram, Mail, MapPin, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const PublicSiteFooter = () => (
  <footer className="public-footer">
    <div className="public-footer-grid">
      <div className="public-footer-intro">
        <img src="/assets/ws-logo.png" alt="WS Gestão Contábil" />
        <p>Contabilidade próxima, tecnologia útil e decisões baseadas em números confiáveis.</p>
        <div className="public-footer-socials">
          <a href="https://www.instagram.com/wscontabil.co/" target="_blank" rel="noreferrer" aria-label="Instagram da WS"><Instagram /></a>
          <a href="https://wa.me/5582999324884" target="_blank" rel="noreferrer" aria-label="WhatsApp da WS"><MessageCircle /></a>
        </div>
      </div>
      <div>
        <h2>Explore</h2>
        <nav aria-label="Links do rodapé">
          <Link to="/">Página inicial</Link>
          <Link to="/guias">Guias para empresas</Link>
          <Link to="/emissor-fiscal">Emissor Fiscal WS</Link>
          <Link to="/termos-de-servico">Termos de serviço</Link>
          <Link to="/politica-de-privacidade">Política de privacidade</Link>
        </nav>
      </div>
      <div>
        <h2>Contato</h2>
        <a className="public-footer-contact" href="https://wa.me/5582999324884" target="_blank" rel="noreferrer"><MessageCircle /> (82) 99932-4884</a>
        <a className="public-footer-contact" href="mailto:contabilie2010@hotmail.com"><Mail /> contabilie2010@hotmail.com</a>
        <p className="public-footer-contact"><MapPin /> Major Isidoro e Palmeira dos Índios — AL</p>
      </div>
    </div>
    <div className="public-footer-bottom">
      <p>© 2026 WS Gestão Contábil · CNPJ 41.346.581/0001-03</p>
      <div><Link to="/termos-de-servico">Termos de serviço</Link><Link to="/politica-de-privacidade">Política de privacidade</Link></div>
    </div>
  </footer>
);

export default PublicSiteFooter;
