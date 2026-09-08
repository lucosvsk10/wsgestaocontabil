import { useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock3, ExternalLink } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import guides from '@/content/business-guides.json';
import PublicSiteFooter from '@/components/public/PublicSiteFooter';
import '../styles/public-content.css';

type Guide = (typeof guides)[number];

const BusinessGuidePage = () => {
  const { slug } = useParams();
  const guide = guides.find((item) => item.slug === slug) as Guide | undefined;

  useEffect(() => {
    if (!guide) return;
    document.title = `${guide.title} | WS Gestão Contábil`;
    const description = document.querySelector('meta[name="description"]') || document.head.appendChild(document.createElement('meta'));
    description.setAttribute('name', 'description');
    description.setAttribute('content', guide.description);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) canonical = document.head.appendChild(document.createElement('link'));
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', `https://www.wsgestaocontabil.com/guias/${guide.slug}`);
    const upsertMeta = (key: string, value: string, property = false) => {
      const attribute = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${key}"]`);
      if (!meta) meta = document.head.appendChild(document.createElement('meta'));
      meta.setAttribute(attribute, key);
      meta.setAttribute('content', value);
    };
    const pageUrl = `https://www.wsgestaocontabil.com/guias/${guide.slug}`;
    upsertMeta('og:type', 'article', true);
    upsertMeta('og:title', guide.title, true);
    upsertMeta('og:description', guide.description, true);
    upsertMeta('og:url', pageUrl, true);
    upsertMeta('og:image', guide.heroImage, true);
    upsertMeta('og:image:alt', guide.heroImageAlt, true);
    upsertMeta('twitter:card', 'summary_large_image');
    upsertMeta('twitter:title', guide.title);
    upsertMeta('twitter:description', guide.description);
    upsertMeta('twitter:image', guide.heroImage);
    window.scrollTo(0, 0);
  }, [guide]);

  if (!guide) return <Navigate to="/guias" replace />;
  const related = guides.filter((item) => item.slug !== guide.slug);

  return (
    <div className="public-page">
      <header className="guide-header">
        <Link to="/" className="guide-brand"><img src="/assets/ws-logo.png" alt="WS Gestão Contábil" /></Link>
        <nav><Link to="/">Início</Link><Link to="/guias">Guias</Link><Link to="/login">Login</Link></nav>
      </header>
      <main>
        <article className="guide-article">
          <Link className="guide-back" to="/guias"><ArrowLeft /> Ver todos os guias</Link>
          <header className="guide-hero">
            <span>{guide.eyebrow}</span>
            <h1>{guide.title}</h1>
            <p>{guide.description}</p>
            <small><Clock3 /> Publicado em 8 de setembro de 2026 · {guide.readingTime}</small>
          </header>
          <figure className="guide-cover">
            <img src={guide.heroImage} alt={guide.heroImageAlt} width="1600" height="900" fetchPriority="high" />
          </figure>
          <div className="guide-layout">
            <div className="guide-body">
              <p className="guide-lead">{guide.intro}</p>
              {guide.sections.map((section, index) => <section key={section.title}>
                <h2>{section.title}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {index === 0 && <figure className="guide-content-image"><img src={guide.contentImage} alt={guide.contentImageAlt} width="1260" height="750" loading="lazy" /></figure>}
                {index === 1 && <aside className="guide-inline-cta"><span>ORIENTAÇÃO WS</span><h3>{guide.ctaTitle}</h3><p>{guide.ctaText}</p><a href="https://wa.me/5582999324884" target="_blank" rel="noreferrer">Conversar com um especialista <ArrowRight /></a></aside>}
              </section>)}
              <section className="guide-checklist"><h2>Checklist para colocar em prática</h2>{guide.checklist.map((item) => <p key={item}><Check /> {item}</p>)}</section>
              <p className="guide-source">Fonte de referência: <a href={guide.sourceUrl} target="_blank" rel="noreferrer">{guide.sourceLabel} <ExternalLink /></a></p>
            </div>
            <aside className="guide-cta"><span>PRECISA ORGANIZAR O PRÓXIMO PASSO?</span><h2>Converse com a equipe da WS.</h2><p>Avaliamos o contexto do seu negócio antes de indicar o caminho.</p><a href="https://wa.me/5582999324884" target="_blank" rel="noreferrer">Falar no WhatsApp <ArrowRight /></a></aside>
          </div>
        </article>
        <section className="guide-related"><div><span>CONTINUE EXPLORANDO</span><h2>Outros guias para o seu negócio</h2></div><div className="guide-related-grid">{related.map((item) => <Link to={`/guias/${item.slug}`} key={item.slug}><span>{item.eyebrow}</span><h3>{item.title}</h3><p>{item.description}</p><small>Ler guia <ArrowRight /></small></Link>)}</div></section>
      </main>
      <PublicSiteFooter />
    </div>
  );
};

export default BusinessGuidePage;
