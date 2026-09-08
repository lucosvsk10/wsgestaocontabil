import { ArrowRight, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import guides from '@/content/business-guides.json';
import PublicSiteFooter from '@/components/public/PublicSiteFooter';
import '../styles/public-content.css';

const BusinessGuidesIndexPage = () => (
  <div className="public-page guides-index-page">
    <header className="guide-header">
      <Link to="/" className="guide-brand"><img src="/assets/ws-logo.png" alt="WS Gestão Contábil" /></Link>
      <nav><Link to="/">Início</Link><Link to="/guias">Guias</Link><Link to="/login">Login</Link></nav>
    </header>
    <main className="guides-index-main">
      <header className="guides-index-hero">
        <span>CONHECIMENTO PARA EMPRESAS</span>
        <h1>Guias práticos para começar e administrar melhor</h1>
        <p>Conteúdo direto sobre abertura, custos e organização financeira para transformar decisões importantes em próximos passos mais seguros.</p>
      </header>
      <section className="public-guide-grid" aria-label="Guias para empresas">
        {guides.map((guide, index) => (
          <Link className="public-guide-card" to={`/guias/${guide.slug}`} key={guide.slug}>
            <img className="public-guide-thumb" src={guide.heroImage} alt={guide.heroImageAlt} loading={index === 0 ? 'eager' : 'lazy'} />
            <span className="public-guide-number">0{index + 1}</span>
            <small>{guide.eyebrow} · <Clock3 aria-hidden="true" /> {guide.readingTime}</small>
            <h2>{guide.title}</h2>
            <p>{guide.description}</p>
            <strong>Ler guia <ArrowRight /></strong>
          </Link>
        ))}
      </section>
    </main>
    <PublicSiteFooter />
  </div>
);

export default BusinessGuidesIndexPage;
