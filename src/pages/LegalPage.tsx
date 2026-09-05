import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '@/styles/legal-pages.css';

const WS_LOGO = '/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png';
const CONTACT_EMAIL = 'contabilie2010@hotmail.com';

export default function LegalPage() {
  const { pathname } = useLocation();
  const isPrivacy = pathname === '/politica-de-privacidade';

  return (
    <div className="legal-page">
      <header className="legal-topbar">
        <Link to="/" className="legal-brand" aria-label="Ir para o início">
          <img src={WS_LOGO} alt="WS Gestão Contábil" />
        </Link>
        <span>Documentos legais do Emissor Fiscal</span>
      </header>

      <main className="legal-main">
        <div className="legal-heading">
          <span>WS Gestão Contábil</span>
          <h1>{isPrivacy ? 'Política de Privacidade' : 'Termos de Serviço'}</h1>
          <p>Última atualização: 5 de setembro de 2026</p>
        </div>

        <nav className="legal-tabs" aria-label="Documentos legais">
          <Link className={!isPrivacy ? 'is-active' : ''} to="/termos-de-servico">Termos de Serviço</Link>
          <Link className={isPrivacy ? 'is-active' : ''} to="/politica-de-privacidade">Política de Privacidade</Link>
        </nav>

        <article className="legal-document">
          {isPrivacy ? <PrivacyPolicy /> : <TermsOfService />}
        </article>
      </main>

      <footer className="legal-footer">
        <span>© 2026 WS Gestão Contábil</span>
        <Link to="/">Voltar ao site</Link>
      </footer>
    </div>
  );
}

function TermsOfService() {
  return (
    <>
      <LegalIntro>
        Estes Termos regulam o acesso e o uso do Emissor Fiscal da WS Gestão Contábil. Ao contratar, criar uma conta ou utilizar o sistema, o assinante declara que leu e aceita estas condições.
      </LegalIntro>

      <LegalSection title="1. Identificação da prestadora">
        <p>O serviço é disponibilizado por <strong>Wilson de Souza Costa</strong>, nome empresarial de atuação <strong>WS Gestão Contábil</strong>, CNPJ nº <strong>41.346.581/0001-03</strong>, com sede no Loteamento Terra do Leite, 29, Quadra 1, Centro, Major Isidoro/AL, CEP 57.580-000, doravante denominada “WS”.</p>
        <p>Contato: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> e telefone (82) 99932-4884.</p>
      </LegalSection>

      <LegalSection title="2. Objeto e funcionamento do serviço">
        <p>O Emissor Fiscal é um software por assinatura destinado ao cadastro de empresas, configuração fiscal, gestão de usuários e emissão e consulta de documentos fiscais eletrônicos disponibilizados no plano contratado.</p>
        <p>O sistema auxilia a operação fiscal, mas não substitui a análise contábil ou tributária aplicável a cada negócio. Funcionalidades, limites, preço e periodicidade são os exibidos na proposta, contratação ou fatura.</p>
      </LegalSection>

      <LegalSection title="3. Conta, acesso e organização">
        <p>O assinante deve fornecer dados verdadeiros, manter seus acessos protegidos e autorizar apenas pessoas vinculadas à sua organização. Ações realizadas por membros autorizados serão consideradas ações da organização, sem prejuízo da apuração de uso indevido comunicado à WS.</p>
        <p>É proibido compartilhar credenciais pessoais, contornar controles de acesso, testar vulnerabilidades sem autorização ou utilizar o sistema para atividades ilícitas.</p>
      </LegalSection>

      <LegalSection title="4. Dados fiscais e certificado digital">
        <p>O assinante é responsável pela exatidão dos cadastros, enquadramento tributário, numeração, séries, alíquotas, destinatários, produtos, serviços e demais informações enviadas para emissão.</p>
        <p>Quando utilizar certificado digital A1, o assinante declara possuir autorização para seu uso e deve manter arquivo, senha, validade, renovação e eventual revogação sob controle. A WS utilizará o certificado apenas para executar operações fiscais solicitadas no sistema e aplicar medidas técnicas de proteção compatíveis com o risco.</p>
      </LegalSection>

      <LegalSection title="5. Emissão e serviços de terceiros">
        <p>A autorização de documentos depende de serviços externos, como SEFAZ, prefeituras, Receita Federal, provedores de certificado, internet e infraestrutura de nuvem. Indisponibilidades, rejeições ou alterações desses ambientes podem afetar o processamento.</p>
        <p>O assinante deve conferir o protocolo, o status de autorização e os arquivos fiscais gerados antes de considerar a operação concluída. Contingência, cancelamento, inutilização, correção e prazos legais seguem as regras do órgão competente.</p>
      </LegalSection>

      <LegalSection title="6. Planos, pagamentos e inadimplência">
        <p>As cobranças são emitidas conforme o plano e o ciclo contratados. O checkout poderá oferecer PIX, cartão de crédito e boleto, processados pelo Mercado Pago. Um pagamento somente será considerado concluído após a confirmação do provedor; no boleto, isso depende da compensação bancária.</p>
        <p>Atrasos podem gerar avisos, restrição temporária de recursos ou suspensão do acesso, preservadas as obrigações legais de retenção e, quando viável, a possibilidade de regularização. Reajustes, descontos, multas, cancelamentos e reembolsos observarão a oferta contratada e a legislação aplicável.</p>
        <p>Direitos obrigatórios do consumidor, quando aplicáveis à relação, permanecem preservados.</p>
      </LegalSection>

      <LegalSection title="7. Disponibilidade, suporte e atualizações">
        <p>A WS poderá realizar manutenções, correções de segurança e adaptações legais ou técnicas. Interrupções programadas serão comunicadas quando razoavelmente possível. O suporte atende dúvidas sobre uso e incidentes do sistema pelos canais informados pela WS.</p>
      </LegalSection>

      <LegalSection title="8. Propriedade intelectual e confidencialidade">
        <p>O software, marca, interface, código e documentação pertencem à WS ou a seus licenciadores. A assinatura concede direito limitado, não exclusivo e intransferível de uso durante a vigência, sem autorização para copiar, revender, realizar engenharia reversa ou explorar o produto fora do contrato.</p>
        <p>Cada parte deve proteger informações confidenciais recebidas da outra e utilizá-las apenas para executar a relação contratual, ressalvadas obrigações legais ou determinações de autoridade competente.</p>
      </LegalSection>

      <LegalSection title="9. Responsabilidades">
        <p>A WS responde pela prestação do serviço nos limites da legislação e do contrato. Não responde por informações incorretas fornecidas pelo assinante, uso não autorizado de credenciais, decisões fiscais tomadas sem validação profissional, falhas de terceiros fora de seu controle razoável ou eventos de força maior.</p>
        <p>Nada nestes Termos exclui responsabilidade que não possa ser afastada por lei, inclusive por dolo, falha de segurança imputável à WS ou violação de direitos legalmente protegidos.</p>
      </LegalSection>

      <LegalSection title="10. Vigência, suspensão e encerramento">
        <p>Os Termos vigoram enquanto houver conta ou obrigação contratual ativa. O assinante poderá solicitar cancelamento conforme o plano. A WS poderá suspender ou encerrar o acesso por inadimplência, fraude, risco de segurança ou violação relevante, com comunicação e oportunidade de correção quando compatíveis com a gravidade do caso.</p>
        <p>Antes do encerramento, o assinante deve exportar os documentos disponíveis. Dados serão mantidos ou eliminados conforme obrigações legais, prazos de retenção e a Política de Privacidade.</p>
      </LegalSection>

      <LegalSection title="11. Alterações e legislação aplicável">
        <p>Estes Termos podem ser atualizados para refletir mudanças no produto, no contrato ou na legislação. Alterações relevantes serão comunicadas pelos canais disponíveis e indicarão a nova data de vigência.</p>
        <p>Aplicam-se as leis brasileiras. Fica eleito o foro de Major Isidoro/AL, salvo competência legal obrigatória ou o direito do consumidor de ajuizar demanda em seu domicílio, quando aplicável.</p>
      </LegalSection>
    </>
  );
}

function PrivacyPolicy() {
  return (
    <>
      <LegalIntro>
        Esta Política explica como a WS Gestão Contábil trata dados pessoais no Emissor Fiscal, no checkout, no atendimento e na administração das assinaturas, em conformidade com a Lei Geral de Proteção de Dados Pessoais — LGPD.
      </LegalIntro>

      <LegalSection title="1. Quem trata os dados">
        <p><strong>Wilson de Souza Costa — WS Gestão Contábil</strong>, CNPJ nº <strong>41.346.581/0001-03</strong>, atua como controladora dos dados de conta, contratação, cobrança, segurança e suporte.</p>
        <p>Nos dados pessoais inseridos pelo assinante em documentos fiscais de seus clientes, fornecedores, transportadores e demais terceiros, a organização assinante normalmente define as finalidades e atua como controladora; a WS atua como operadora, tratando-os conforme as instruções do assinante e as exigências legais.</p>
      </LegalSection>

      <LegalSection title="2. Dados tratados">
        <ul>
          <li>cadastro e contato, como nome, e-mail, telefone, cargo e credenciais de acesso;</li>
          <li>dados da organização, incluindo CNPJ, inscrições, endereço, regime e configurações fiscais;</li>
          <li>dados necessários aos documentos fiscais, como CPF/CNPJ, endereços, produtos, serviços e valores;</li>
          <li>certificado digital A1, senha associada e metadados de validade, quando fornecidos para emissão;</li>
          <li>dados técnicos e de segurança, como IP, dispositivo, registros de acesso, ações no sistema e armazenamento local essencial;</li>
          <li>dados de atendimento, solicitações e comunicações;</li>
          <li>dados de cobrança, como faturas, valor, método escolhido, identificador e status do pagamento.</li>
        </ul>
        <p>Os dados completos do cartão são informados no ambiente do Mercado Pago e não devem ser armazenados no Emissor Fiscal. A WS recebe apenas as referências e informações de status necessárias à conciliação.</p>
      </LegalSection>

      <LegalSection title="3. Finalidades e bases legais">
        <p>Tratamos dados para criar e proteger contas; executar a assinatura e emitir documentos solicitados; autenticar usuários e organizações; processar cobranças; prestar suporte; prevenir fraude; manter registros técnicos; cumprir obrigações fiscais, contábeis e regulatórias; exercer direitos; e melhorar a estabilidade do produto.</p>
        <p>As bases legais podem incluir execução de contrato e procedimentos preliminares, cumprimento de obrigação legal ou regulatória, exercício regular de direitos, legítimo interesse com avaliação de necessidade e impacto e, quando realmente necessário, consentimento para finalidades opcionais específicas.</p>
      </LegalSection>

      <LegalSection title="4. Compartilhamento e operadores">
        <p>Dados podem ser compartilhados, no limite necessário, com Mercado Pago para cobrança; Supabase e provedores de nuvem para banco de dados, autenticação e infraestrutura; SEFAZ, prefeituras, Receita Federal e demais autoridades para operações fiscais; fornecedores de suporte e segurança; e autoridades mediante obrigação legal ou ordem válida.</p>
        <p>Esses destinatários tratam dados conforme suas funções, contratos e políticas próprias. A WS não comercializa dados pessoais.</p>
      </LegalSection>

      <LegalSection title="5. Transferências internacionais">
        <p>Alguns provedores podem armazenar ou processar dados fora do Brasil. Quando isso ocorrer, a WS adotará mecanismos contratuais e salvaguardas compatíveis com a LGPD e exigirá proteção adequada dos fornecedores envolvidos.</p>
      </LegalSection>

      <LegalSection title="6. Armazenamento e retenção">
        <p>Os dados são mantidos durante a relação contratual e, depois dela, pelos prazos necessários ao cumprimento de obrigações legais, defesa de direitos, prevenção a fraude e manutenção de cópias de segurança. Certificados e credenciais deixam de ser utilizados após revogação, substituição ou encerramento, observados os ciclos técnicos de exclusão e obrigações aplicáveis.</p>
      </LegalSection>

      <LegalSection title="7. Segurança">
        <p>A WS adota controles técnicos e administrativos proporcionais ao risco, incluindo gestão de acesso, registro de atividades, criptografia em trânsito, segregação por organização, cópias de segurança e revisão de incidentes. Nenhum ambiente é imune a riscos; incidentes relevantes serão avaliados e comunicados nos termos da legislação.</p>
      </LegalSection>

      <LegalSection title="8. Direitos dos titulares">
        <p>O titular pode solicitar confirmação e acesso, correção, anonimização, bloqueio ou eliminação quando cabíveis, portabilidade conforme regulamentação, informação sobre compartilhamentos, revisão de decisões automatizadas, oposição e demais direitos previstos na LGPD.</p>
        <p>Solicitações podem ser enviadas para <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. A WS poderá pedir informações para confirmar a identidade e a legitimidade do pedido. Quando a WS atuar apenas como operadora, encaminhará ou apoiará o atendimento junto à organização controladora.</p>
      </LegalSection>

      <LegalSection title="9. Cookies e armazenamento local">
        <p>O sistema utiliza recursos essenciais de sessão e armazenamento local para autenticação, segurança, preferências e seleção da empresa. Se ferramentas opcionais de análise ou publicidade forem adotadas, será apresentado aviso e controle apropriado antes de sua ativação, quando exigido.</p>
      </LegalSection>

      <LegalSection title="10. Menores de idade e alterações">
        <p>O Emissor Fiscal é destinado a representantes e profissionais vinculados a organizações, não sendo dirigido a crianças. Esta Política poderá ser atualizada por mudanças legais, técnicas ou operacionais; alterações relevantes serão informadas e a data acima será revisada.</p>
      </LegalSection>

      <LegalSection title="11. Contato">
        <p>Dúvidas, solicitações de privacidade ou comunicações de segurança podem ser enviadas para <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, pelo telefone (82) 99932-4884 ou para o endereço Loteamento Terra do Leite, 29, Quadra 1, Centro, Major Isidoro/AL, CEP 57.580-000.</p>
      </LegalSection>
    </>
  );
}

function LegalIntro({ children }: { children: ReactNode }) {
  return <p className="legal-intro">{children}</p>;
}

function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
