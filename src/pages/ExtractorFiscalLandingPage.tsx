import { useEffect } from 'react';
import { ArrowRight, Building2, Check, FileArchive, FileSearch, RefreshCcw, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicSiteFooter from '@/components/public/PublicSiteFooter';
import '../styles/public-content.css';
import '../styles/fiscal-issuer-landing.css';

const whatsapp='https://wa.me/5582999324884?text=Ol%C3%A1%2C%20quero%20conhecer%20o%20Extrator%20Fiscal%20WS.';
const features=[
  {icon:FileSearch,title:'Compras e vendas em uma visão só',text:'Consulte documentos fiscais vinculados às empresas que você acompanha e filtre a rotina sem depender de várias telas.'},
  {icon:Building2,title:'Feito para trabalhar com várias empresas',text:'Organize as empresas do escritório em um ambiente separado do cadastro de clientes do painel contábil.'},
  {icon:RefreshCcw,title:'Sincronização por empresa',text:'Atualize a empresa que precisa de atenção, acompanhe o processamento e mantenha o histórico organizado.'},
  {icon:FileArchive,title:'XML e documentos no mesmo fluxo',text:'Recupere e organize arquivos fiscais quando houver disponibilidade para a empresa e para o documento consultado.'},
  {icon:ShieldCheck,title:'A1 só quando for necessário',text:'O cadastro da empresa começa pelo CNPJ. O certificado A1 é opcional e entra quando a operação de extração exigir autenticação.'},
];

export default function ExtractorFiscalLandingPage(){
 useEffect(()=>{window.scrollTo({top:0,left:0,behavior:'auto'})},[]);
 return <div className="public-page issuer-page">
  <header className="guide-header issuer-header"><Link to="/home-preview" className="guide-brand"><img src="/assets/ws-logo.png" alt="WS Gestão Contábil"/></Link><nav><Link to="/home-preview">Início</Link><a href="#recursos">Recursos</a><a href="#como-funciona">Como funciona</a><Link to="/login">Login</Link></nav></header>
  <main>
   <section className="issuer-hero">
    <div className="issuer-hero-copy"><span className="issuer-kicker">EXTRATOR FISCAL WS</span><h1>As notas das suas empresas, <em>sem caça ao documento.</em></h1><p>Centralize a consulta de documentos fiscais, acompanhe compras e vendas e reduza o trabalho de procurar arquivos empresa por empresa.</p><div className="issuer-actions"><a className="issuer-primary" href={whatsapp} target="_blank" rel="noreferrer">Quero conhecer o Extrator <ArrowRight/></a><Link className="issuer-secondary" to="/login">Já tenho acesso</Link></div><div className="issuer-proof"><span><Check/> Multiempresa</span><span><Check/> CNPJ com preenchimento cadastral</span><span><Check/> A1 opcional</span></div></div>
    <div className="issuer-product-view" style={{padding:0,overflow:'hidden'}}><img src="/assets/ws-extrator-fiscal.png" alt="Tela do Extrator Fiscal WS" style={{display:'block',width:'100%',height:'100%',objectFit:'cover',objectPosition:'top left'}}/></div>
   </section>
   <section id="recursos" className="issuer-section"><div className="issuer-section-heading"><span>MENOS PROCURA. MAIS CONFERÊNCIA.</span><h2>Um painel pensado para a rotina fiscal do escritório.</h2><p>O foco não é encher a tela de recursos: é chegar mais rápido aos documentos e às empresas que precisam de atenção.</p></div><div className="issuer-feature-grid">{features.map(({icon:Icon,title,text})=><article key={title}><Icon/><h3>{title}</h3><p>{text}</p></article>)}</div></section>
   <section id="como-funciona" className="issuer-flow"><div><span>DO CNPJ AO DOCUMENTO</span><h2>Cadastre primeiro. Conecte o A1 quando precisar extrair.</h2><p>O sistema busca os dados cadastrais pelo CNPJ e mantém o certificado como uma etapa separada, usada apenas nas rotinas em que ele é necessário.</p><a href={whatsapp} target="_blank" rel="noreferrer">Ver uma demonstração <ArrowRight/></a></div><ol><li><b>01</b><span><strong>Adicione a empresa</strong>Informe o CNPJ e aproveite o preenchimento automático dos dados disponíveis.</span></li><li><b>02</b><span><strong>Escolha o que consultar</strong>Acesse documentos e sincronizações dentro da empresa selecionada.</span></li><li><b>03</b><span><strong>Conecte o A1, se necessário</strong>Use o certificado somente quando a fonte fiscal exigir autenticação.</span></li></ol></section>
   <section className="issuer-security"><ShieldCheck/><div><span>SEPARAÇÃO POR EMPRESA</span><h2>O Extrator não mistura o fiscal com o cadastro do cliente.</h2><p>As empresas vinculadas ao produto ficam em um workspace próprio, com acesso controlado e configuração fiscal específica.</p></div><a href={whatsapp} target="_blank" rel="noreferrer">Tirar dúvidas <ArrowRight/></a></section>
   <section className="issuer-final-cta"><span>PARE DE PROCURAR NOTA EMPRESA POR EMPRESA.</span><h2>Coloque a consulta fiscal em um fluxo único.</h2><p>Fale com a WS e veja como o Extrator pode entrar na rotina do seu escritório.</p><div><a className="issuer-primary" href={whatsapp} target="_blank" rel="noreferrer">Quero ver o Extrator funcionando <ArrowRight/></a></div></section>
  </main><PublicSiteFooter/>
 </div>
}
