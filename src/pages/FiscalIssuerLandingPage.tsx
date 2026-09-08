import { useEffect } from 'react';
import { ArrowRight, BarChart3, Check, FileCheck2, History, LockKeyhole, PackageCheck, ReceiptText, ShieldCheck, Sparkles, UsersRound, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicSiteFooter from '@/components/public/PublicSiteFooter';
import '../styles/public-content.css';
import '../styles/fiscal-issuer-landing.css';

const whatsapp = 'https://wa.me/5582999324884?text=Ol%C3%A1%2C%20quero%20conhecer%20o%20Emissor%20Fiscal%20WS.';

const capabilities = [
  { icon: ReceiptText, title: 'Cinco documentos em um só lugar', text: 'Emita NF-e, NFC-e, NFS-e, CT-e e MDF-e sem trocar de sistema.' },
  { icon: UsersRound, title: 'Cadastros que economizam tempo', text: 'Reutilize clientes, produtos e serviços nas próximas emissões.' },
  { icon: History, title: 'Histórico sempre organizado', text: 'Consulte documentos, status, chaves e dados das emissões anteriores.' },
  { icon: BarChart3, title: 'Visão clara da operação', text: 'Acompanhe volume, faturamento e produtos com informações do próprio emissor.' },
  { icon: LockKeyhole, title: 'Certificado A1 protegido', text: 'Configure o certificado em um fluxo reservado à sua organização.' },
  { icon: PackageCheck, title: 'Repetir sem redigitar tudo', text: 'Reaproveite partes de emissões anteriores e revise antes de transmitir.' },
];

const included = ['NF-e, NFC-e, NFS-e, CT-e e MDF-e', 'Cadastro de clientes, produtos e serviços', 'Histórico e consulta de emissões', 'Configuração fiscal e certificado A1', 'Relatórios operacionais', 'Acesso ao suporte WS'];

const FiscalIssuerLandingPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="public-page issuer-page">
      <header className="guide-header issuer-header">
        <Link to="/" className="guide-brand"><img src="/assets/ws-logo.png" alt="WS Gestão Contábil" /></Link>
        <nav><Link to="/">Início</Link><a href="#recursos">Recursos</a><a href="#precos">Planos</a><Link to="/guias">Guias</Link><Link to="/login">Login</Link></nav>
      </header>

      <main>
        <section className="issuer-hero">
          <div className="issuer-hero-copy">
            <span className="issuer-kicker"><Sparkles /> EMISSOR FISCAL WS</span>
            <h1>Emita documentos fiscais com <em>menos etapas.</em></h1>
            <p>Cadastros, emissão, histórico e acompanhamento em um ambiente criado para a rotina de quem precisa faturar sem perder tempo.</p>
            <div className="issuer-actions">
              <a className="issuer-primary" href="#precos">Ver planos <ArrowRight /></a>
              <a className="issuer-secondary" href={whatsapp} target="_blank" rel="noreferrer">Falar com a WS</a>
            </div>
            <div className="issuer-proof"><span><Check /> 5 tipos de documento</span><span><Check /> Configuração assistida</span><span><Check /> Ambiente seguro</span></div>
          </div>

          <div className="issuer-product-view" aria-label="Visão resumida do Emissor Fiscal WS">
            <div className="issuer-product-top"><span>Visão geral</span><b>Ambiente de produção</b></div>
            <div className="issuer-product-total"><small>Emissões no período</small><strong>128</strong><span>+18% no mês</span></div>
            <div className="issuer-product-chart" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
            <div className="issuer-product-row"><FileCheck2 /><div><b>NF-e nº 000128</b><small>Autorizada agora</small></div><strong>R$ 1.840,00</strong></div>
            <div className="issuer-product-row"><FileCheck2 /><div><b>NFS-e nº 000127</b><small>Autorizada hoje</small></div><strong>R$ 690,00</strong></div>
            <button type="button"><Zap /> Nova emissão</button>
          </div>
        </section>

        <section id="recursos" className="issuer-section">
          <div className="issuer-section-heading"><span>ROTINA MAIS SIMPLES</span><h2>O essencial para emitir e continuar trabalhando.</h2><p>Recursos conectados para reduzir tarefas repetidas e deixar cada documento fácil de encontrar.</p></div>
          <div className="issuer-feature-grid">{capabilities.map(({ icon: Icon, title, text }) => <article key={title}><Icon /><h3>{title}</h3><p>{text}</p></article>)}</div>
        </section>

        <section className="issuer-flow">
          <div><span>DO CADASTRO À AUTORIZAÇÃO</span><h2>Um fluxo que mostra o próximo passo.</h2><p>Configure a empresa uma vez, escolha o documento e revise as informações antes da transmissão.</p><a href={whatsapp} target="_blank" rel="noreferrer">Quero uma apresentação <ArrowRight /></a></div>
          <ol><li><b>01</b><span><strong>Prepare a empresa</strong>Dados fiscais, séries, numeração e certificado A1.</span></li><li><b>02</b><span><strong>Monte o documento</strong>Cliente, itens, valores, impostos e informações da operação.</span></li><li><b>03</b><span><strong>Revise e transmita</strong>Confira o resumo e acompanhe o retorno da autorização.</span></li></ol>
        </section>

        <section id="precos" className="issuer-pricing issuer-section">
          <div className="issuer-section-heading"><span>PREÇO DE LANÇAMENTO</span><h2>Escolha como prefere pagar.</h2><p>Os mesmos recursos nos dois planos. No anual, você economiza o equivalente a dois meses.</p></div>
          <div className="issuer-price-grid">
            <article className="issuer-price-card">
              <span>MENSAL</span><h3>Flexibilidade para começar</h3><div className="issuer-price"><small>R$</small><strong>39,90</strong><small>/mês</small></div><p>Cobrança mensal e possibilidade de cancelar a renovação para o próximo ciclo.</p>
              <ul>{included.map((item) => <li key={item}><Check /> {item}</li>)}</ul>
              <Link to="/login">Começar no mensal <ArrowRight /></Link>
            </article>
            <article className="issuer-price-card is-featured">
              <div className="issuer-save">ECONOMIZE R$ 79,80</div><span>ANUAL</span><h3>Mais economia no ano</h3><div className="issuer-price"><small>R$</small><strong>399</strong><small>/ano</small></div><p>Equivale a R$ 33,25 por mês, com pagamento anual e 16,7% de desconto.</p>
              <ul>{included.map((item) => <li key={item}><Check /> {item}</li>)}</ul>
              <Link to="/login">Escolher o anual <ArrowRight /></Link>
            </article>
          </div>
          <small className="issuer-price-note">Valores de lançamento. A emissão depende da configuração fiscal, do certificado digital quando aplicável e da disponibilidade dos órgãos autorizadores.</small>
        </section>

        <section className="issuer-security">
          <ShieldCheck /><div><span>SEUS DADOS, SUA ORGANIZAÇÃO</span><h2>Acesso separado por empresa e operação protegida.</h2><p>O Emissor WS foi estruturado com autenticação, isolamento por organização e controles específicos para dados fiscais e certificado digital.</p></div><a href={whatsapp} target="_blank" rel="noreferrer">Tirar dúvidas <ArrowRight /></a>
        </section>

        <section className="issuer-final-cta"><span>PRONTO PARA CONHECER?</span><h2>Veja como o Emissor WS se encaixa na sua rotina.</h2><p>Converse com a equipe, tire suas dúvidas e receba orientação para preparar a primeira emissão.</p><div><a className="issuer-primary" href={whatsapp} target="_blank" rel="noreferrer">Falar com um especialista <ArrowRight /></a><Link className="issuer-secondary" to="/guias/quando-emitir-nota-fiscal">Ler guia de emissão fiscal</Link></div></section>
      </main>
      <PublicSiteFooter />
    </div>
  );
};

export default FiscalIssuerLandingPage;
