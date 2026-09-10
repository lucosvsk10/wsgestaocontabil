import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Building2, Briefcase, Calculator, FileCheck2, FileSearch2, FileText, FolderX, Instagram, MessageCircle, Receipt, ShieldCheck, Target, UserRound, Users, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import guides from '@/content/business-guides.json';
import TrustedCompaniesSection from '@/components/public/TrustedCompaniesSection';
import OfficeExperienceSection from '@/components/public/OfficeExperienceSection';
import PublicSiteFooter from '@/components/public/PublicSiteFooter';
import '../styles/home-preview.css';
import '../styles/public-content.css';
import '../styles/home-clients.css';

const services = [
  { icon: Building2, title: <>Abertura <strong>de<br />empresa</strong></>, description: 'CNPJ, definição de CNAE, regime tributário, inscrições e regularização inicial.' },
  { icon: Calculator, title: <><strong>Contabilidade</strong><br />mensal</>, description: 'Escrituração, balancetes, DRE, obrigações acessórias e acompanhamento contábil.' },
  { icon: Users, title: <><strong>Departamento</strong><br />pessoal e folha<br />de pagamento</>, description: 'Admissão, demissão, férias, 13º, folha, encargos, eSocial e FGTS.' },
  { icon: Target, title: <><strong>Planejamento</strong><br />tributário</>, description: 'Análise de Simples Nacional, Lucro Presumido e Lucro Real para reduzir carga tributária de forma legal.' },
  { icon: FileText, title: <>Imposto de<br />Renda <strong>Pessoa<br />Física</strong></>, description: 'Declaração anual, ganho de capital, investimentos, imóveis e regularização de pendências.' },
  { icon: ShieldCheck, title: <>Regularização<br /><strong>de empresa e<br />débitos</strong></>, description: 'CNPJ inapto, pendências na Receita, certidões negativas e regularização fiscal.' },
  { icon: Receipt, title: <>Emissão <strong>e<br />orientação</strong><br />sobre notas<br />fiscais</>, description: 'NF-e, NFS-e, NFC-e, configuração fiscal e orientação sobre operações.' },
  { icon: Wallet, title: <>BPO<br /><strong>financeiro</strong></>, description: 'Contas a pagar e receber, conciliação de caixa, organização financeira e relatórios.' },
  { icon: Briefcase, title: <>Alteração<br /><strong>contratual e<br />serviços</strong><br />societários</>, description: 'Mudança de endereço, atividade, transformação e organização empresarial.' },
  { icon: FolderX, title: <>Encerramento<br /><strong>de empresa</strong></>, description: 'Baixa de CNPJ, inscrições, regularização e encerramento nos órgãos competentes.' },
];

const software = [
  { audience: 'PARA EMPRESAS', badge: 'MELHOR APP DE EMISSÃO NACIONAL', title: <>EMISSOR DE<br /><span>NOTAS FISCAIS</span></>, description: 'Emita e gerencie suas notas fiscais em um só lugar.', cta: <>VER OFERTA <small>POR TEMPO LIMITADO</small><ArrowUpRight size={18} /></>, icon: 'document', urgent: true, href: '/emissor-fiscal' },
  { audience: 'PESSOAL / EMPRESARIAL', title: <>SIMULADORES<br />DE <span>IMPOSTOS</span></>, description: 'Calcule impostos, contribuições e encargos em poucos segundos.', cta: <>VER SIMULADOR <ArrowUpRight size={18} /></>, icon: 'calculator', urgent: false, href: '/simulador-irpf' },
  { audience: 'PARA EMPRESAS', badge: 'LICENÇA OFICIAL DA SEFAZ', title: <>EXTRATOR DE<br /><span>COMPRAS E<br />VENDAS</span></>, description: 'Busque e organize suas notas fiscais de compras e vendas de forma automática.', cta: <>VER OFERTA <small>POR TEMPO LIMITADO</small><ArrowUpRight size={18} /></>, icon: 'document', urgent: true, href: '/extrator-fiscal' },
];

const heroMessages = [
  ['Contabilidade', 'Aliada ao seu', 'empreendimento'],
  ['Mais clareza', 'para o seu', 'negócio'],
  ['Gestão contábil', 'para sua', 'empresa crescer'],
  ['Seu negócio', 'no caminho', 'certo'],
  ['Decisões melhores', 'começam com', 'bons números'],
  ['Cuidamos dos', 'números do seu', 'negócio'],
  ['Contabilidade', 'feita para', 'crescer'],
  ['Seu negócio', 'merece mais', 'tranquilidade'],
  ['Estratégia e', 'precisão para', 'sua empresa'],
  ['Tudo em ordem', 'para você', 'avançar'],
];

const HomePreview = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [founderOpen, setFounderOpen] = useState(false);
  const [founderSrc, setFounderSrc] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => setHeroIndex((current) => (current + 1) % heroMessages.length), 4800);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    document.title = 'WS Gestão Contábil | Contabilidade e tecnologia para empresas';
    const hash = window.location.hash;
    if (hash) window.requestAnimationFrame(() => document.querySelector(hash)?.scrollIntoView());
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/assets/ws-contador-home-real.png', { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`Falha ao carregar retrato: HTTP ${response.status}`);
        return response.text();
      })
      .then((base64) => {
        if (!active) return;
        const cleanBase64 = base64.trim();
        if (!cleanBase64.startsWith('iVBOR')) throw new Error('PNG do contador inválido');
        setFounderSrc(`data:image/png;base64,${cleanBase64}`);
      })
      .catch((error) => console.error(error));
    return () => { active = false; };
  }, []);

  const heroMessage = heroMessages[heroIndex];
  const featuredGuide = guides[0];
  const guideRail = guides.slice(1, 5);

  return (
    <div className="home-preview">
      <header className="preview-navbar-wrap">
        <nav className="preview-navbar" aria-label="Navegação principal">
          <a className="preview-brand" href="#inicio" aria-label="WS Gestão Contábil — início"><img src="/assets/ws-logo.png" alt="WS Gestão Contábil" /></a>
          <button className="preview-mobile-toggle" type="button" aria-label="Abrir menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><span /><span /><span /></button>
          <div className={`preview-nav-links ${menuOpen ? 'is-open' : ''}`}>
            <a href="#servicos" onClick={() => setMenuOpen(false)}>SERVIÇOS</a>
            <a href="#softwares" onClick={() => setMenuOpen(false)}>SOFTWARES</a>
            <a href="#conteudos" onClick={() => setMenuOpen(false)}>CONTEÚDOS</a>
            <a href="#escritorio" onClick={() => setMenuOpen(false)}>ESCRITÓRIO</a>
            <a href="#duvidas" onClick={() => setMenuOpen(false)}>DÚVIDAS</a>
            <Link className="preview-login" to="/login"><UserRound size={19} /> LOGIN</Link>
            <Link className="preview-register" to="/cadastro">CADASTRE-SE</Link>
          </div>
        </nav>
      </header>

      <main>
        <section id="inicio" className="preview-hero preview-section">
          <img className="preview-hero-mark" src="/assets/ws-emblem.png" alt="" aria-hidden="true" />
          <div className="preview-hero-copy">
            <h1 key={heroIndex} className="preview-hero-title preview-hero-title-switch" aria-live="polite"><span>{heroMessage[0]}</span><strong>{heroMessage[1]}</strong><strong>{heroMessage[2]}</strong></h1>
            <p className="preview-hero-subtitle">O que sua empresa precisar, em um só lugar.</p>
            <a className="preview-start-button" href="#servicos">COMECE AQUI</a>
          </div>
          <div id="sobre" className={`preview-founder ${founderOpen ? 'is-open' : ''}`}>
            <img className="preview-founder-emblem" src="/assets/ws-founder-emblem.webp" alt="" aria-hidden="true" />
            <div className="preview-founder-portrait">
              {founderSrc && <img className="preview-founder-image" src={founderSrc} alt="Wilson Souza, contador e CEO da WS Gestão Contábil" />}
              <button className="preview-founder-info" type="button" aria-expanded={founderOpen} onClick={() => setFounderOpen((open) => !open)}>
                <span className="preview-founder-name">WILSON SOUZA</span>
                <span className="preview-founder-details">
                  <span>CONTADOR E CEO DA<br />WS GESTÃO HÁ MAIS DE 16 ANOS</span>
                  <span>REFERÊNCIA <strong>#1</strong> EM<br />CONTABILIDADE EM TODO O NORDESTE</span>
                </span>
              </button>
            </div>
            <div className="preview-socials"><a href="https://www.instagram.com/wscontabil.co/" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={27} /></a><a href="https://wa.me/5582999324884" target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle size={27} /></a></div>
          </div>
        </section>

        <section id="servicos" className="preview-services preview-section">
          <div className="preview-services-heading"><h2>O QUE VOCÊ<br />PRECISA?</h2><div className="preview-other-service"><p>Precisa de outra coisa?</p><a href="https://wa.me/5582999324884" target="_blank" rel="noreferrer">CLIQUE AQUI</a></div></div>
          <div className="preview-service-grid">{services.map((service, index) => { const ServiceIcon = service.icon; return <a className="preview-service-card" href="https://wa.me/5582999324884" target="_blank" rel="noreferrer" key={`${index}-${service.description}`}><span className="preview-service-art" aria-hidden="true"><ServiceIcon strokeWidth={1.8} /></span><h3>{service.title}</h3><p>{service.description}</p></a>; })}</div>
        </section>

        <section id="softwares" className="preview-software preview-section">
          <h2>SOFTWARES WS</h2>
          <div className="preview-software-grid">{software.map((item) => <article className="preview-software-card" key={item.audience + item.title.toString()}><div className="preview-software-meta"><span>{item.audience}</span>{item.badge && <span className="preview-software-badge">{item.badge}</span>}</div><h3>{item.title}</h3><p>{item.description}</p><Link className={`preview-software-cta ${item.urgent ? 'is-urgent' : ''}`} to={item.href}>{item.cta}</Link><div className={`preview-software-icon ${item.icon}`} aria-hidden="true">{item.icon === 'calculator' ? <Calculator /> : item.badge?.includes('SEFAZ') ? <FileSearch2 /> : <FileCheck2 />}</div></article>)}</div>
        </section>

        <TrustedCompaniesSection />

        <section id="conteudos" className="public-guides preview-section public-guides-editorial" aria-labelledby="guides-title">
          <div className="public-guides-head-row">
            <div className="public-section-heading">
              <span>CONTEÚDO PARA DECIDIR MELHOR</span>
              <h2 id="guides-title">GUIAS PARA QUEM<br />ESTÁ CONSTRUINDO</h2>
              <p>Sem conteúdo genérico: cada guia organiza uma decisão real de quem está abrindo, administrando ou reorganizando uma empresa.</p>
            </div>
            <Link className="public-guides-all" to="/guias">Ver todos os guias <ArrowUpRight /></Link>
          </div>
          <div className="public-guides-featured">
            <Link className="public-guide-feature" to={`/guias/${featuredGuide.slug}`}>
              <img src={featuredGuide.heroImage} alt={featuredGuide.heroImageAlt} loading="lazy" />
              <div><small>{featuredGuide.eyebrow} · {featuredGuide.readingTime}</small><h3>{featuredGuide.title}</h3><p>{featuredGuide.description}</p><strong>Começar por este guia <ArrowRight /></strong></div>
            </Link>
            <div className="public-guide-rail">
              {guideRail.map((guide, index) => <Link to={`/guias/${guide.slug}`} key={guide.slug}><span>0{index + 2}</span><div><small>{guide.eyebrow}</small><h3>{guide.title}</h3><p>{guide.readingTime}</p></div><ArrowUpRight /></Link>)}
            </div>
          </div>
        </section>

        <OfficeExperienceSection />

        <section id="duvidas" className="public-faq preview-section" aria-labelledby="faq-title">
          <div className="public-section-heading"><span>ANTES DE COMEÇAR</span><h2 id="faq-title">DÚVIDAS<br />FREQUENTES</h2><p>Respostas diretas para facilitar sua decisão.</p></div>
          <div className="public-faq-list">
            <details><summary>A WS atende empresas fora de Major Isidoro?</summary><p>Sim. A equipe atende presencialmente em Major Isidoro e Palmeira dos Índios e também acompanha empresas de outras cidades com processos digitais.</p></details>
            <details><summary>Como funciona a troca de contador?</summary><p>Primeiro analisamos a situação da empresa e os documentos disponíveis. Depois, orientamos a transição e o contato com a contabilidade anterior para preservar a continuidade das obrigações.</p></details>
            <details><summary>Posso conversar com a WS antes de abrir o CNPJ?</summary><p>Sim. Essa conversa ajuda a avaliar atividade, endereço, participação de sócios e a estrutura mais adequada antes do registro.</p></details>
            <details><summary>A WS oferece sistema para emissão de notas fiscais?</summary><p>Sim. O Emissor WS reúne emissão e gerenciamento de notas em um ambiente próprio para empresas.</p></details>
            <details><summary>Quanto tempo leva para abrir uma empresa?</summary><p>O prazo varia conforme atividade, município, análise de viabilidade e licenças necessárias. A equipe informa uma estimativa após conhecer o caso.</p></details>
            <details><summary>Como falar com a equipe?</summary><p>Você pode chamar diretamente pelo WhatsApp no número (82) 99932-4884.</p></details>
          </div>
        </section>
      </main>
      <PublicSiteFooter />
    </div>
  );
};

export default HomePreview;
