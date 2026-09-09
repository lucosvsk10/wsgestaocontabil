import { ArrowUpRight, Instagram, Mail, MapPin, MessageCircle, Route, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicCookieConsent from './PublicCookieConsent';

const PublicSiteFooter = () => (
  <>
    <footer className="public-footer">
      <div className="public-footer-cta">
        <div><span>PRONTO PARA ORGANIZAR SUA EMPRESA?</span><h2>Converse com quem vai olhar o seu caso de verdade.</h2></div>
        <a href="https://wa.me/5582999324884" target="_blank" rel="noreferrer">Falar com a WS <ArrowUpRight /></a>
      </div>

      <div className="public-footer-grid">
        <div className="public-footer-intro">
          <img src="/assets/ws-logo.png" alt="WS Gestão Contábil" />
          <p>Contabilidade próxima, tecnologia útil e decisões baseadas em números confiáveis.</p>
          <div className="public-footer-trust"><ShieldCheck /><span>Ambiente digital protegido<br /><small>Atendimento presencial e online</small></span></div>
          <div className="public-footer-socials">
            <a href="https://www.instagram.com/wscontabil.co/" target="_blank" rel="noreferrer" aria-label="Instagram da WS"><Instagram /></a>
            <a href="https://wa.me/5582999324884" target="_blank" rel="noreferrer" aria-label="WhatsApp da WS"><MessageCircle /></a>
          </div>
        </div>

        <div>
          <h2>WS Gestão</h2>
          <nav aria-label="Institucional">
            <Link to="/">Página inicial</Link>
            <a href="/#servicos">Serviços contábeis</a>
            <a href="/#empresas">Empresas que confiam</a>
            <a href="/#escritorio">Conheça o escritório</a>
            <a href="/#duvidas">Dúvidas frequentes</a>
          </nav>
        </div>

        <div>
          <h2>Soluções e conteúdo</h2>
          <nav aria-label="Soluções e conteúdo">
            <Link to="/guias">Guias para empresas</Link>
            <Link to="/emissor-fiscal">Emissor Fiscal WS</Link>
            <Link to="/login">Extrator Fiscal</Link>
            <Link to="/simulador-irpf">Simuladores</Link>
            <Link to="/login">Área do cliente</Link>
          </nav>
        </div>

        <div>
          <h2>Contato e unidades</h2>
          <a className="public-footer-contact" href="https://wa.me/5582999324884" target="_blank" rel="noreferrer"><MessageCircle /> (82) 99932-4884</a>
          <a className="public-footer-contact" href="mailto:contabilie2010@hotmail.com"><Mail /> contabilie2010@hotmail.com</a>
          <a className="public-footer-location" href="https://maps.app.goo.gl/cthtEGbJGqGBTVVo9" target="_blank" rel="noreferrer"><MapPin /><span><strong>Sede</strong>Major Isidoro — AL</span><Route /></a>
          <a className="public-footer-location" href="https://maps.app.goo.gl/nCabkeuY39TkrYv59" target="_blank" rel="noreferrer"><MapPin /><span><strong>Filial</strong>Palmeira dos Índios — AL</span><Route /></a>
        </div>
      </div>

      <div className="public-footer-bottom">
        <p>© 2026 WS Gestão Contábil · CNPJ 41.346.581/0001-03</p>
        <div><Link to="/termos-de-servico">Termos de serviço</Link><Link to="/politica-de-privacidade">Política de privacidade e cookies</Link></div>
      </div>
    </footer>
    <PublicCookieConsent />
  </>
);

export default PublicSiteFooter;
