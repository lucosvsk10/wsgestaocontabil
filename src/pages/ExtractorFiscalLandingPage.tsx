import { useEffect } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  FileArchive,
  FileCheck2,
  MessageCircleOff,
  RefreshCcw,
  SearchCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicSiteFooter from '@/components/public/PublicSiteFooter';
import '../styles/public-content.css';
import '../styles/fiscal-issuer-landing.css';

const whatsapp = 'https://wa.me/5582999324884?text=Ol%C3%A1%2C%20quero%20testar%20o%20Extrator%20Fiscal%20WS.';

const extractorBenefits = [
  {
    icon: MessageCircleOff,
    title: 'Menos cobrança no WhatsApp',
    text: 'Pare de lembrar cada cliente, várias vezes por mês, que os XML ainda não chegaram ao escritório.',
  },
  {
    icon: Building2,
    title: 'Cada CNPJ no lugar certo',
    text: 'Consulte uma carteira inteira sem misturar documentos, certificados ou histórico entre empresas.',
  },
  {
    icon: FileArchive,
    title: 'Compras e vendas reunidas',
    text: 'Visualize documentos de entrada e saída e identifique o que já está disponível para o fechamento.',
  },
  {
    icon: SearchCheck,
    title: 'Conferência antes do prazo apertar',
    text: 'Acompanhe quantidade, movimentação e disponibilidade de XML sem esperar o cliente responder.',
  },
  {
    icon: Download,
    title: 'XML pronto para trabalhar',
    text: 'Localize e baixe os arquivos disponíveis quando for importar, conferir ou arquivar a documentação fiscal.',
  },
  {
    icon: RefreshCcw,
    title: 'Histórico de sincronização',
    text: 'Saiba quando cada empresa foi atualizada e volte exatamente ao CNPJ que precisa de atenção.',
  },
];

const commonPlanItems = [
  'Compras e vendas por empresa',
  'Download dos XML disponíveis',
  'Painel de movimentação da carteira',
  'Histórico e acompanhamento de sincronização',
  'Suporte da equipe WS',
];

export default function ExtractorFiscalLandingPage() {
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, []);

  return (
    <div className="public-page product-landing product-extractor">
      <header className="guide-header product-header">
        <Link to="/home-preview" className="guide-brand"><img src="/assets/ws-logo.png" alt="WS Gestão Contábil" /></Link>
        <nav aria-label="Navegação do Extrator Fiscal">
          <Link to="/home-preview">Início</Link>
          <a href="#problema">O problema</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#planos">Planos</a>
          <Link to="/emissor-fiscal">Emissor</Link>
          <Link className="product-header-login" to="/login">Entrar</Link>
        </nav>
      </header>

      <main>
        <section className="product-hero extractor-hero">
          <div className="product-hero-copy">
            <span className="product-eyebrow"><FileCheck2 /> FEITO PARA ESCRITÓRIOS CONTÁBEIS</span>
            <h1>Pare de pedir nota. Comece o fechamento com os documentos <em>na mão.</em></h1>
            <p>O Extrator busca e organiza documentos fiscais de compras e vendas por empresa, para sua equipe não depender do cliente enviar XML pelo WhatsApp.</p>
            <div className="product-actions">
              <Link className="product-primary" to="/cadastro?product=extractor&plan=extractor_commercial">Testar grátis por 7 dias <ArrowRight /></Link>
              <a className="product-secondary" href={whatsapp} target="_blank" rel="noreferrer">Ver uma demonstração</a>
            </div>
            <div className="product-assurances" aria-label="Benefícios do Extrator Fiscal">
              <span><Check /> Compras e vendas</span>
              <span><Check /> Carteira multiempresa</span>
              <span><Check /> XML organizado</span>
            </div>
          </div>

          <figure className="product-hero-visual extractor-hero-visual">
            <div className="extractor-grid-glow" aria-hidden="true" />
            <img src="/assets/ws-extrator-dashboard-transparent-v2.png" alt="Painel do Extrator Fiscal WS com empresas, documentos, movimentação e gráfico dos últimos 30 dias" />
            <figcaption>
              <span><CheckCircle2 /> Sem cobrar o cliente</span>
              <strong>XML organizado por empresa</strong>
            </figcaption>
          </figure>
        </section>

        <section id="problema" className="extractor-deadline">
          <header>
            <span>O ATRASO COMEÇA ANTES DO FECHAMENTO</span>
            <h2>Enquanto sua equipe cobra arquivos, o prazo continua correndo.</h2>
          </header>
          <div className="extractor-deadline-track">
            <article><b>01</b><small>COMEÇO DO MÊS</small><h3>“Você consegue mandar as notas?”</h3><p>A primeira cobrança entra no meio de dezenas de conversas do cliente.</p></article>
            <article><b>02</b><small>DIAS DEPOIS</small><h3>Chegam PDFs, fotos e alguns XML</h3><p>A equipe precisa conferir o que veio, o que está faltando e de qual empresa é cada arquivo.</p></article>
            <article><b>03</b><small>PERTO DO PRAZO</small><h3>O fechamento ainda está incompleto</h3><p>Começam as novas cobranças, o retrabalho e a correria que poderia ter sido evitada.</p></article>
            <article className="is-solution"><b><CheckCircle2 /></b><small>COM O EXTRATOR WS</small><h3>Documentos separados por CNPJ</h3><p>Sua equipe abre a empresa, confere compras e vendas e trabalha com o que já foi capturado.</p></article>
          </div>
        </section>

        <section className="product-section extractor-benefits">
          <header className="product-section-heading">
            <span>NÃO É SÓ BAIXAR XML</span>
            <h2>É devolver previsibilidade à rotina fiscal.</h2>
            <p>O Extrator transforma uma busca espalhada por mensagens, e-mails e pastas em uma visão organizada por empresa.</p>
          </header>
          <div className="product-feature-grid">
            {extractorBenefits.map(({ icon: Icon, title, text }, index) => (
              <article key={title}>
                <div><Icon /><small>0{index + 1}</small></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="extractor-workflow">
          <div className="extractor-workflow-copy">
            <span>DO CNPJ AO ARQUIVO</span>
            <h2>Uma carteira inteira, sem perder o contexto de cada empresa.</h2>
            <p>Cadastre o CNPJ, conecte o certificado quando a consulta exigir e acompanhe os documentos fiscais em um workspace próprio.</p>
            <a href={whatsapp} target="_blank" rel="noreferrer">Quero ver o fluxo completo <ArrowRight /></a>
          </div>
          <ol>
            <li><b>1</b><div><strong>Adicione a empresa</strong><p>Informe o CNPJ e mantenha a carteira fiscal separada por cliente.</p></div></li>
            <li><b>2</b><div><strong>Conecte o A1 quando necessário</strong><p>O certificado fica associado à empresa correta para autenticar as consultas aplicáveis.</p></div></li>
            <li><b>3</b><div><strong>Sincronize compras e vendas</strong><p>Acompanhe a captura e enxergue a movimentação do período por CNPJ.</p></div></li>
            <li><b>4</b><div><strong>Confira e baixe</strong><p>Localize os documentos disponíveis e leve os XML para a próxima etapa do fechamento.</p></div></li>
          </ol>
        </section>

        <section id="planos" className="product-pricing extractor-pricing">
          <div className="product-price-intro">
            <span>COMECE COM 7 DIAS GRÁTIS</span>
            <h2>Planos para o volume da sua carteira.</h2>
            <p>Escolha pela quantidade de documentos processados. Se a operação crescer, sua equipe pode mudar de plano sem trocar de sistema.</p>
          </div>
          <div className="extractor-price-grid">
            <article className="product-price-card">
              <div className="product-price-label"><span>COMERCIAL</span><b>7 DIAS GRÁTIS</b></div>
              <p className="product-anchor-price">de <s>R$ 129/mês</s> por</p>
              <div className="product-price"><small>R$</small><strong>99</strong><span>/mês</span></div>
              <p>Para escritórios que querem organizar a captura recorrente da carteira.</p>
              <div className="extractor-plan-limit"><strong>20.000 XML</strong><span>processados por mês</span></div>
              <ul>{commonPlanItems.map((item) => <li key={item}><CheckCircle2 /> {item}</li>)}</ul>
              <Link to="/cadastro?product=extractor&plan=extractor_commercial">Testar o plano Comercial <ArrowRight /></Link>
            </article>
            <article className="product-price-card is-featured">
              <div className="product-price-label"><span>EMPRESARIAL</span><b>SEM LIMITAÇÕES</b></div>
              <p className="product-anchor-price">de <s>R$ 299/mês</s> por</p>
              <div className="product-price"><small>R$</small><strong>250</strong><span>/mês</span></div>
              <p>Para operações maiores que não querem administrar franquia de documentos.</p>
              <div className="extractor-plan-limit"><strong>XML e empresas ilimitados</strong><span>para a rotina do escritório</span></div>
              <ul>{commonPlanItems.map((item) => <li key={item}><CheckCircle2 /> {item}</li>)}</ul>
              <Link to="/cadastro?product=extractor&plan=extractor_enterprise">Testar o plano Empresarial <ArrowRight /></Link>
            </article>
          </div>
        </section>

        <section className="product-faq" aria-labelledby="extractor-faq-title">
          <div className="product-section-heading"><span>DÚVIDAS DO ESCRITÓRIO</span><h2 id="extractor-faq-title">Antes de conectar sua carteira.</h2></div>
          <div>
            <details><summary>O cliente ainda precisa enviar os XML?</summary><p>O objetivo do Extrator é reduzir essa dependência. Os documentos fiscais disponíveis para consulta são organizados no sistema por empresa, sem esperar o envio manual do cliente.</p></details>
            <details><summary>O sistema separa compras e vendas?</summary><p>Sim. A equipe consegue consultar documentos de entrada e saída dentro da empresa selecionada.</p></details>
            <details><summary>Preciso cadastrar o certificado A1?</summary><p>O CNPJ pode ser cadastrado primeiro. O A1 é conectado quando a fonte fiscal e a operação de extração exigem autenticação.</p></details>
            <details><summary>Posso acompanhar várias empresas?</summary><p>Sim. O Extrator foi desenhado para uma carteira multiempresa, mantendo documentos e configurações separados por CNPJ.</p></details>
          </div>
        </section>

        <section className="product-final-cta extractor-final">
          <div><span><Clock3 /> O PRÓXIMO FECHAMENTO NÃO PRECISA COMEÇAR COM COBRANÇAS</span><h2>Teste o Extrator por 7 dias com empresas da sua própria carteira.</h2></div>
          <Link className="product-primary" to="/cadastro?product=extractor&plan=extractor_commercial">Começar gratuitamente <ArrowRight /></Link>
        </section>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
