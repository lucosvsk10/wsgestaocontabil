import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Building2, Briefcase, Calculator, Check, FileCheck2, FileSearch2, FileText, FolderX, Instagram, MessageCircle, Receipt, ShieldCheck, Sparkles, Target, UserRound, Users, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
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
  { audience: 'PARA EMPRESAS', badge: 'MAIS ESCOLHIDO', name: 'Emissor Fiscal', price: '39,90', currency: 'R$', period: '/mês', description: 'Emita e gerencie suas notas fiscais em um só lugar.', features: ['NF-e, NFC-e, NFS-e, CT-e e MDF-e', 'Cadastros e histórico organizados', 'Suporte para começar'], cta: 'Começar agora', icon: 'document', featured: true, href: '/emissor-fiscal' },
  { audience: 'PESSOAL E EMPRESARIAL', name: 'Simuladores', price: 'Grátis', description: 'Calcule impostos, contribuições e encargos em poucos segundos.', features: ['Cálculos rápidos e objetivos', 'Resultados explicados', 'Acesso imediato, sem custo'], cta: 'Usar simuladores', icon: 'calculator', featured: false, href: '/simulador-irpf' },
  { audience: 'PARA EMPRESAS', badge: 'INTEGRAÇÃO SEFAZ', name: 'Extrator Fiscal', price: 'Sob consulta', description: 'Centralize notas de compras e vendas e reduza o trabalho manual.', features: ['Compras e vendas em um só painel', 'Organização por empresa', 'Consulta fiscal automatizada'], cta: 'Conhecer o Extrator', icon: 'search', featured: false, href: '/extrator-fiscal' },
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

  useEffect(() => {
    const timer = window.setInterval(() => setHeroIndex((current) => (current + 1) % heroMessages.length), 4800);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    document.title = 'WS Gestão Contábil | Contabilidade e tecnologia para empresas';
    const hash = window.location.hash;
    if (hash) window.requestAnimationFrame(() => document.querySelector(hash)?.scrollIntoView());
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
              <img className="preview-founder-image" src="/assets/ws-contador-home.png" alt="Wilson Souza, contador e CEO da WS Gestão Contábil" />
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
          <motion.div className="preview-pricing-heading" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .55 }} transition={{ duration: .55 }}>
            <span>SOLUÇÕES PARA CADA MOMENTO</span>
            <h2>PLANOS E<br />SOFTWARES WS</h2>
            <p>Escolha a solução que simplifica sua rotina agora. Preços claros, acesso direto e suporte da WS.</p>
          </motion.div>
          <div className="preview-software-grid">{software.map((item, index) => <motion.article className={`preview-software-card ${item.featured ? 'is-featured' : ''}`} key={item.name} initial={{ opacity: 0, y: 34 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .25 }} transition={{ duration: .5, delay: index * .1 }} whileHover={{ y: -8 }}>
            {item.featured && <span className="preview-pricing-popular"><Sparkles size={14} /> RECOMENDADO</span>}
            <div className="preview-software-meta"><span>{item.audience}</span>{item.badge && <span className="preview-software-badge">{item.badge}</span>}</div>
            <div className={`preview-software-icon ${item.icon}`} aria-hidden="true">{item.icon === 'calculator' ? <Calculator /> : item.icon === 'search' ? <FileSearch2 /> : <FileCheck2 />}</div>
            <h3>{item.name}</h3>
            <p className="preview-software-description">{item.description}</p>
            <div className="preview-software-price">{item.currency && <small>{item.currency}</small>}<strong>{item.price}</strong>{item.period && <span>{item.period}</span>}</div>
            <ul>{item.features.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul>
            <Link className="preview-software-cta" to={item.href}>{item.cta}<ArrowUpRight size={18} /></Link>
          </motion.article>)}</div>
          <p className="preview-pricing-note">O plano anual do Emissor também está disponível por R$ 399/ano. Condições e limites completos aparecem antes da contratação.</p>
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
