import { useEffect } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Files,
  History,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicSiteFooter from '@/components/public/PublicSiteFooter';
import '../styles/public-content.css';
import '../styles/fiscal-issuer-landing.css';

const whatsapp = 'https://wa.me/5582999324884?text=Ol%C3%A1%2C%20quero%20conhecer%20o%20Emissor%20Fiscal%20WS.';

const issuerBenefits = [
  {
    icon: UsersRound,
    title: 'Cliente já cadastrado não precisa ser digitado de novo',
    text: 'Salve clientes, transportadoras e dados de cobrança para reutilizar nas próximas emissões.',
  },
  {
    icon: PackageCheck,
    title: 'Produtos e serviços ficam prontos para a próxima venda',
    text: 'Descrição, unidade e informações fiscais permanecem organizadas para você montar a nota mais rápido.',
  },
  {
    icon: Files,
    title: 'Cinco documentos fiscais em uma única rotina',
    text: 'Emita NF-e, NFC-e, NFS-e, CT-e e MDF-e sem espalhar a operação entre portais diferentes.',
  },
  {
    icon: History,
    title: 'A nota não desaparece depois da transmissão',
    text: 'Consulte histórico, situação, valores e documentos emitidos sem procurar XML em pastas soltas.',
  },
  {
    icon: FileCheck2,
    title: 'Revisão antes de transmitir',
    text: 'Confira destinatário, itens, totais e dados fiscais antes de enviar o documento para autorização.',
  },
  {
    icon: ShieldCheck,
    title: 'Cada empresa com sua própria configuração',
    text: 'Série, numeração, ambiente e certificado A1 ficam associados ao CNPJ correto.',
  },
];

const included = [
  'Emissões sem limite de quantidade',
  'NF-e, NFC-e, NFS-e, CT-e e MDF-e',
  'Cadastros reutilizáveis de clientes e itens',
  'Histórico e consulta de documentos',
  'Configuração fiscal por empresa',
  'Suporte da equipe WS',
];

const FiscalIssuerLandingPage = () => {
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, []);

  return (
    <div className="public-page product-landing product-issuer">
      <header className="guide-header product-header">
        <Link to="/home-preview" className="guide-brand"><img src="/assets/ws-logo.png" alt="WS Gestão Contábil" /></Link>
        <nav aria-label="Navegação do Emissor Fiscal">
          <Link to="/home-preview">Início</Link>
          <a href="#rotina">Como funciona</a>
          <a href="#documentos">Documentos</a>
          <a href="#preco">Preço</a>
          <Link to="/extrator-fiscal">Extrator</Link>
          <Link className="product-header-login" to="/login">Entrar</Link>
        </nav>
      </header>

      <main>
        <section className="product-hero">
          <div className="product-hero-copy">
            <span className="product-eyebrow"><ReceiptText /> PARA QUEM EMITE NOTA TODOS OS DIAS</span>
            <h1>Emitir nota não deveria tomar o tempo de <em>vender.</em></h1>
            <p>Cadastre clientes e produtos uma vez, emita os principais documentos fiscais e acompanhe tudo em um só painel — sem recomeçar cada venda do zero.</p>
            <div className="product-actions">
              <Link className="product-primary" to="/cadastro">Testar grátis por 7 dias <ArrowRight /></Link>
              <a className="product-secondary" href={whatsapp} target="_blank" rel="noreferrer">Pedir uma demonstração</a>
            </div>
            <div className="product-assurances" aria-label="Condições do Emissor Fiscal">
              <span><Check /> Emissões ilimitadas</span>
              <span><Check /> R$ 69 por mês</span>
              <span><Check /> Suporte WS</span>
            </div>
          </div>

          <figure className="product-hero-visual issuer-hero-visual">
            <div className="product-orbit" aria-hidden="true" />
            <img src="/assets/ws-emissor-dashboard-transparent-v2.png" alt="Painel do Emissor Fiscal WS com faturamento, vendas, produtos e atalhos de emissão" />
            <figcaption>
              <span><CheckCircle2 /> Painel real do produto</span>
              <strong>Da venda à nota autorizada</strong>
            </figcaption>
          </figure>
        </section>

        <section className="issuer-friction" aria-label="Problemas eliminados pelo Emissor Fiscal">
          <div><small>ANTES</small><strong>Digitar o mesmo cliente em cada nota</strong></div>
          <ArrowRight aria-hidden="true" />
          <div><small>COM O EMISSOR WS</small><strong>Selecionar o cadastro e seguir com a emissão</strong></div>
          <div><small>ANTES</small><strong>Procurar notas em pastas e portais</strong></div>
          <ArrowRight aria-hidden="true" />
          <div><small>COM O EMISSOR WS</small><strong>Consultar o histórico no mesmo painel</strong></div>
        </section>

        <section id="rotina" className="product-section issuer-benefits">
          <header className="product-section-heading">
            <span>MENOS REDIGITAÇÃO EM CADA VENDA</span>
            <h2>O sistema guarda o trabalho que você já fez.</h2>
            <p>O ganho não está em “ter mais uma tela”. Está em não preencher novamente dados que já existem e em saber onde encontrar cada emissão depois.</p>
          </header>
          <div className="product-feature-grid">
            {issuerBenefits.map(({ icon: Icon, title, text }, index) => (
              <article key={title}>
                <div><Icon /><small>0{index + 1}</small></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="documentos" className="issuer-documents">
          <div className="issuer-documents-copy">
            <span>UM PAINEL PARA CINCO ROTINAS</span>
            <h2>Venda, serviço e transporte sem trocar de sistema.</h2>
            <p>Escolha o documento adequado à operação e mantenha cadastros, configurações e histórico no mesmo ambiente.</p>
          </div>
          <div className="issuer-document-list">
            <article><b>NF-e</b><span>Venda de produtos</span></article>
            <article><b>NFC-e</b><span>Venda ao consumidor</span></article>
            <article><b>NFS-e</b><span>Prestação de serviços</span></article>
            <article><b>CT-e</b><span>Prestação de transporte</span></article>
            <article><b>MDF-e</b><span>Manifesto de documentos</span></article>
          </div>
        </section>

        <section className="product-process">
          <header className="product-section-heading">
            <span>DA CONFIGURAÇÃO À AUTORIZAÇÃO</span>
            <h2>Um caminho claro até a nota pronta.</h2>
          </header>
          <ol>
            <li><b>01</b><div><strong>Configure a empresa</strong><p>Defina CNPJ, séries, numeração, ambiente e certificado quando aplicável.</p></div></li>
            <li><b>02</b><div><strong>Escolha ou reutilize os cadastros</strong><p>Selecione cliente, produtos ou serviços já salvos e complete apenas o que mudou.</p></div></li>
            <li><b>03</b><div><strong>Revise antes de enviar</strong><p>Confira a operação e transmita o documento para autorização.</p></div></li>
            <li><b>04</b><div><strong>Acompanhe pelo histórico</strong><p>Volte à emissão, consulte o status e localize o documento quando precisar.</p></div></li>
          </ol>
        </section>

        <section id="preco" className="product-pricing issuer-single-price">
          <div className="product-price-intro">
            <span>7 DIAS PARA TESTAR NA SUA ROTINA</span>
            <h2>Um plano. Todas as emissões.</h2>
            <p>Use os recursos do Emissor durante o período gratuito. Depois, continue por uma mensalidade única e sem limite de notas.</p>
          </div>
          <article className="product-price-card is-issuer">
            <div className="product-price-label"><span>EMISSOR FISCAL WS</span><b>7 DIAS GRÁTIS</b></div>
            <p className="product-anchor-price">de <s>R$ 89/mês</s> por</p>
            <div className="product-price"><small>R$</small><strong>69</strong><span>/mês</span></div>
            <p>Emissão ilimitada, sem planos por quantidade de notas.</p>
            <ul>{included.map((item) => <li key={item}><CheckCircle2 /> {item}</li>)}</ul>
            <Link to="/cadastro">Começar meus 7 dias grátis <ArrowRight /></Link>
          </article>
        </section>

        <section className="product-faq" aria-labelledby="issuer-faq-title">
          <div className="product-section-heading"><span>ANTES DE COMEÇAR</span><h2 id="issuer-faq-title">Dúvidas de quem vai emitir.</h2></div>
          <div>
            <details><summary>Existe limite de notas por mês?</summary><p>Não. A assinatura mensal do Emissor Fiscal WS não limita a quantidade de emissões.</p></details>
            <details><summary>Quais documentos posso emitir?</summary><p>O sistema reúne NF-e, NFC-e, NFS-e, CT-e e MDF-e. A disponibilidade de cada documento depende da configuração fiscal da empresa e dos órgãos autorizadores.</p></details>
            <details><summary>Preciso de certificado digital?</summary><p>O certificado A1 é necessário nas operações em que a legislação e o órgão autorizador exigem autenticação digital.</p></details>
            <details><summary>Consigo cadastrar mais de uma empresa?</summary><p>Sim. Cada empresa mantém seus próprios dados fiscais, séries, numeração e certificado.</p></details>
          </div>
        </section>

        <section className="product-final-cta issuer-final">
          <div><span><Clock3 /> SETE DIAS PARA EMITIR DE VERDADE</span><h2>Teste com a rotina da sua empresa, não com uma apresentação genérica.</h2></div>
          <Link className="product-primary" to="/cadastro">Criar minha conta grátis <ArrowRight /></Link>
        </section>
      </main>
      <PublicSiteFooter />
    </div>
  );
};

export default FiscalIssuerLandingPage;
