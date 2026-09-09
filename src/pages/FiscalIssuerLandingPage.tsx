import { useEffect } from 'react';
import { ArrowRight, BarChart3, Check, History, LockKeyhole, PackageCheck, ReceiptText, ShieldCheck, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicSiteFooter from '@/components/public/PublicSiteFooter';
import '../styles/public-content.css';
import '../styles/fiscal-issuer-landing.css';

const whatsapp = 'https://wa.me/5582999324884?text=Ol%C3%A1%2C%20quero%20conhecer%20o%20Emissor%20Fiscal%20WS.';

const capabilities = [
  { icon: ReceiptText, title: 'Um emissor, vários documentos', text: 'NF-e, NFC-e, NFS-e, CT-e e MDF-e no mesmo ambiente, sem espalhar a operação entre sistemas diferentes.' },
  { icon: UsersRound, title: 'Cadastre uma vez e reutilize', text: 'Clientes, produtos e serviços ficam disponíveis para as próximas emissões e reduzem redigitação.' },
  { icon: History, title: 'Histórico no lugar certo', text: 'Encontre emissões anteriores, acompanhe status e volte ao documento sem procurar em pastas e portais.' },
  { icon: BarChart3, title: 'A operação aparece no painel', text: 'Tenha uma leitura rápida do que foi emitido e do que ainda precisa de atenção dentro do próprio produto.' },
  { icon: LockKeyhole, title: 'A1 separado e protegido', text: 'O certificado fica ligado à empresa e à configuração fiscal, sem virar um arquivo perdido na máquina.' },
  { icon: PackageCheck, title: 'Repita o que faz sentido', text: 'Reaproveite dados de emissões anteriores quando a operação se repete e revise antes de transmitir.' },
];

const included = ['NF-e, NFC-e, NFS-e, CT-e e MDF-e', 'Cadastro de clientes, produtos e serviços', 'Histórico e consulta de emissões', 'Configuração fiscal e certificado A1', 'Relatórios operacionais', 'Acesso ao suporte WS'];

const FiscalIssuerLandingPage = () => {
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, []);
  return <div className="public-page issuer-page">
    <header className="guide-header issuer-header"><Link to="/home-preview" className="guide-brand"><img src="/assets/ws-logo.png" alt="WS Gestão Contábil" /></Link><nav><Link to="/home-preview">Início</Link><a href="#recursos">Recursos</a><a href="#precos">Planos</a><Link to="/extrator-fiscal">Extrator</Link><Link to="/login">Login</Link></nav></header>
    <main>
      <section className="issuer-hero">
        <div className="issuer-hero-copy"><span className="issuer-kicker">EMISSOR FISCAL WS</span><h1>Pare de redigitar a mesma emissão <em>todo dia.</em></h1><p>Emita os principais documentos fiscais, reutilize cadastros e acompanhe o histórico em um fluxo feito para quem precisa faturar e seguir trabalhando.</p><div className="issuer-actions"><a className="issuer-primary" href="#precos">Começar agora <ArrowRight /></a><a className="issuer-secondary" href={whatsapp} target="_blank" rel="noreferrer">Ver uma demonstração</a></div><div className="issuer-proof"><span><Check /> 5 tipos de documento</span><span><Check /> Multiempresa</span><span><Check /> A1 por empresa</span></div></div>
        <div className="issuer-product-view" style={{padding:0,overflow:'hidden'}}><img src="/assets/ws-emissor-fiscal.png" alt="Tela do Emissor Fiscal WS" style={{display:'block',width:'100%',height:'100%',objectFit:'cover',objectPosition:'top left'}} /></div>
      </section>

      <section id="recursos" className="issuer-section"><div className="issuer-section-heading"><span>O QUE MUDA NA ROTINA</span><h2>Menos portal, menos redigitação, mais controle.</h2><p>O WS não tenta parecer um ERP gigante. Ele concentra a operação fiscal que você precisa executar e consultar no dia a dia.</p></div><div className="issuer-feature-grid">{capabilities.map(({ icon: Icon, title, text }) => <article key={title}><Icon /><h3>{title}</h3><p>{text}</p></article>)}</div></section>

      <section className="issuer-flow"><div><span>DO CADASTRO À AUTORIZAÇÃO</span><h2>Você sabe onde está e qual é o próximo passo.</h2><p>Cadastre a empresa, escolha o documento, preencha a operação e revise antes de transmitir. Quando a emissão se repetir, reutilize o que já existe.</p><a href={whatsapp} target="_blank" rel="noreferrer">Quero ver esse fluxo <ArrowRight /></a></div><ol><li><b>01</b><span><strong>Configure a empresa</strong>CNPJ, dados fiscais, séries, numeração e A1 quando aplicável.</span></li><li><b>02</b><span><strong>Monte ou reutilize</strong>Escolha cliente e itens, ou aproveite dados de uma emissão anterior.</span></li><li><b>03</b><span><strong>Revise e transmita</strong>Confira o resumo antes da transmissão e acompanhe o retorno da autorização.</span></li></ol></section>

      <section className="issuer-section"><div className="issuer-section-heading"><span>VISUAL DE PRODUTO, NÃO PROMESSA</span><h2>Veja o ambiente que você realmente vai usar.</h2><p>O painel foi desenhado para manter emissão, cadastros, configurações e histórico dentro da mesma navegação.</p></div><div style={{display:'grid',gridTemplateColumns:'1.2fr .8fr',gap:18,alignItems:'stretch'}}><img src="/assets/ws-emissor-fiscal.png" alt="Painel do Emissor Fiscal WS" style={{width:'100%',height:'100%',minHeight:320,objectFit:'cover',objectPosition:'top left',borderRadius:16,border:'1px solid rgba(148,163,184,.2)'}}/><img src="/assets/ws-portal-cliente.png" alt="Ecossistema digital WS" style={{width:'100%',height:'100%',minHeight:320,objectFit:'cover',objectPosition:'top left',borderRadius:16,border:'1px solid rgba(148,163,184,.2)'}}/></div></section>

      <section id="precos" className="issuer-pricing issuer-section"><div className="issuer-section-heading"><span>PREÇO DE LANÇAMENTO</span><h2>Escolha como prefere pagar.</h2><p>Os mesmos recursos nos dois planos. No anual, o custo mensal equivalente é menor.</p></div><div className="issuer-price-grid"><article className="issuer-price-card"><span>MENSAL</span><h3>Flexibilidade para começar</h3><div className="issuer-price"><small>R$</small><strong>39,90</strong><small>/mês</small></div><p>Cobrança mensal e possibilidade de cancelar a renovação para o próximo ciclo.</p><ul>{included.map((item) => <li key={item}><Check /> {item}</li>)}</ul><Link to="/cadastro">Criar minha conta <ArrowRight /></Link></article><article className="issuer-price-card is-featured"><div className="issuer-save">ECONOMIZE R$ 79,80</div><span>ANUAL</span><h3>Mais economia no ano</h3><div className="issuer-price"><small>R$</small><strong>399</strong><small>/ano</small></div><p>Equivale a R$ 33,25 por mês, com pagamento anual e 16,7% de desconto.</p><ul>{included.map((item) => <li key={item}><Check /> {item}</li>)}</ul><Link to="/cadastro">Quero o plano anual <ArrowRight /></Link></article></div><small className="issuer-price-note">Valores de lançamento. A emissão depende da configuração fiscal, do certificado digital quando aplicável e da disponibilidade dos órgãos autorizadores.</small></section>

      <section className="issuer-security"><ShieldCheck /><div><span>OPERAÇÃO SEPARADA POR EMPRESA</span><h2>Dados fiscais e acesso organizados por contexto.</h2><p>O Emissor WS usa autenticação e separação por organização para reduzir mistura de dados entre empresas.</p></div><a href={whatsapp} target="_blank" rel="noreferrer">Tirar dúvidas <ArrowRight /></a></section>
      <section className="issuer-final-cta"><span>SE VOCÊ EMITE TODO DIA, O RETRABALHO TAMBÉM ACONTECE TODO DIA.</span><h2>Troque a repetição por um fluxo que reaproveita o que você já cadastrou.</h2><p>Crie sua conta ou peça uma apresentação rápida do Emissor Fiscal WS.</p><div><Link className="issuer-primary" to="/cadastro">Criar minha conta <ArrowRight /></Link><a className="issuer-secondary" href={whatsapp} target="_blank" rel="noreferrer">Quero uma demonstração</a></div></section>
    </main><PublicSiteFooter />
  </div>;
};
export default FiscalIssuerLandingPage;
