import { useEffect, useState } from 'react';
import { ArrowUpRight, Calculator, FileCheck2, FileSearch2, Instagram, Lightbulb, MessageCircle, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../styles/home-preview.css';

const services = [
  { title: <>Abertura <strong>de<br />empresa</strong></>, description: 'CNPJ, definição de CNAE, regime tributário, inscrições e regularização inicial.' },
  { title: <><strong>Contabilidade</strong><br />mensal</>, description: 'Escrituração, balancetes, DRE, obrigações acessórias e acompanhamento contábil.' },
  { title: <><strong>Departamento</strong><br />pessoal e folha<br />de pagamento</>, description: 'Admissão, demissão, férias, 13º, folha, encargos, eSocial e FGTS.' },
  { title: <><strong>Planejamento</strong><br />tributário</>, description: 'Análise de Simples Nacional, Lucro Presumido e Lucro Real para reduzir carga tributária de forma legal.' },
  { title: <>Imposto de<br />Renda <strong>Pessoa<br />Física</strong></>, description: 'Declaração anual, ganho de capital, investimentos, imóveis e regularização de pendências.' },
  { title: <>Regularização<br /><strong>de empresa e<br />débitos</strong></>, description: 'CNPJ inapto, pendências na Receita, certidões negativas e regularização fiscal.' },
  { title: <>Emissão <strong>e<br />orientação</strong><br />sobre notas<br />fiscais</>, description: 'NF-e, NFS-e, NFC-e, configuração fiscal e orientação sobre operações.' },
  { title: <>BPO<br /><strong>financeiro</strong></>, description: 'Contas a pagar e receber, conciliação de caixa, organização financeira e relatórios.' },
  { title: <>Alteração<br /><strong>contratual e<br />serviços</strong><br />societários</>, description: 'Mudança de endereço, atividade, transformação e organização empresarial.' },
  { title: <>Encerramento<br /><strong>de empresa</strong></>, description: 'Baixa de CNPJ, inscrições, regularização e encerramento nos órgãos competentes.' },
];

const software = [
  { audience: 'PARA EMPRESAS', badge: 'MELHOR APP DE EMISSÃO NACIONAL', title: <>EMISSOR DE<br /><span>NOTAS FISCAIS</span></>, description: 'Emita e gerencie suas notas fiscais em um só lugar.', cta: <>VER OFERTA <small>POR TEMPO LIMITADO</small><ArrowUpRight size={18} /></>, icon: 'document', urgent: true },
  { audience: 'PESSOAL / EMPRESARIAL', title: <>SIMULADORES<br />DE <span>IMPOSTOS</span></>, description: 'Calcule impostos, contribuições e encargos em poucos segundos.', cta: <>VER SIMULADOR <ArrowUpRight size={18} /></>, icon: 'calculator', urgent: false },
  { audience: 'PARA EMPRESAS', badge: 'LICENÇA OFICIAL DA SEFAZ', title: <>EXTRATOR DE<br /><span>COMPRAS E<br />VENDAS</span></>, description: 'Busque e organize suas notas fiscais de compras e vendas de forma automática.', cta: <>VER OFERTA <small>POR TEMPO LIMITADO</small><ArrowUpRight size={18} /></>, icon: 'document', urgent: true },
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

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroMessages.length);
    }, 4800);
    return () => window.clearInterval(timer);
  }, []);

  const heroMessage = heroMessages[heroIndex];

  return (
    <div className="home-preview">
      <header className="preview-navbar-wrap">
        <nav className="preview-navbar" aria-label="Navegação principal">
          <a className="preview-brand" href="#inicio" aria-label="WS Gestão Contábil — início">
            <img src="/assets/ws-logo.png" alt="WS Gestão Contábil" />
          </a>
          <button className="preview-mobile-toggle" type="button" aria-label="Abrir menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <span /><span /><span />
          </button>
          <div className={`preview-nav-links ${menuOpen ? 'is-open' : ''}`}>
            <a href="#servicos" onClick={() => setMenuOpen(false)}>SERVIÇOS</a>
            <a href="#sobre" onClick={() => setMenuOpen(false)}>QUEM SOMOS</a>
            <a href="#softwares" onClick={() => setMenuOpen(false)}>SOBRE</a>
            <Link className="preview-login" to="/login"><UserRound size={19} /> LOGIN</Link>
            <Link className="preview-register" to="/login">CADASTRE-SE</Link>
          </div>
          <button className="preview-theme" type="button" aria-label="Alternar tema"><Lightbulb size={30} strokeWidth={1.8} /></button>
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
          <div id="sobre" className="preview-founder">
            <div className="preview-founder-panel"><div className="preview-founder-copy"><h2>WILSON SOUZA</h2><p>CONTADOR E CEO DA<br />WS GESTÃO A MAIS DE 16<br />ANOS</p><p className="preview-founder-highlight">REFERÊNCIA <strong>#1</strong> EM<br />CONTABILIDADE EM<br />TODO O NORDESTE</p></div></div>
            <img className="preview-founder-image" src="/assets/ws-contador-cutout-hq.webp" alt="Wilson Souza, contador e CEO da WS Gestão Contábil" />
            <div className="preview-socials"><a href="https://www.instagram.com/wscontabil.co/" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={27} /></a><a href="https://wa.me/5582999324884" target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle size={27} /></a></div>
          </div>
        </section>

        <section id="servicos" className="preview-services preview-section">
          <div className="preview-services-heading"><h2>O QUE VOCÊ<br />PRECISA?</h2><div className="preview-other-service"><p>Precisa de outra coisa?</p><a href="https://wa.me/5582999324884" target="_blank" rel="noreferrer">CLIQUE AQUI</a></div></div>
          <div className="preview-service-grid">{services.map((service, index) => <a className="preview-service-card" href="https://wa.me/5582999324884" target="_blank" rel="noreferrer" key={`${index}-${service.description}`}><h3>{service.title}</h3><p>{service.description}</p></a>)}</div>
        </section>

        <section id="softwares" className="preview-software preview-section">
          <h2>SOFTWARES WS</h2>
          <div className="preview-software-grid">{software.map((item) => <article className="preview-software-card" key={item.audience + item.title.toString()}><div className="preview-software-meta"><span>{item.audience}</span>{item.badge && <span className="preview-software-badge">{item.badge}</span>}</div><h3>{item.title}</h3><p>{item.description}</p><a className={`preview-software-cta ${item.urgent ? 'is-urgent' : ''}`} href="/login">{item.cta}</a><div className={`preview-software-icon ${item.icon}`} aria-hidden="true">{item.icon === 'calculator' ? <Calculator /> : item.badge?.includes('SEFAZ') ? <FileSearch2 /> : <FileCheck2 />}</div></article>)}</div>
        </section>
      </main>
    </div>
  );
};

export default HomePreview;
