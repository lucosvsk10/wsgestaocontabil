import { ArrowRight, Building2, FileSearch, ReceiptText } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import '@/styles/signup-chooser.css';

export default function SignupChooserPage() {
  return (
    <main className="signup-chooser">
      <header className="signup-chooser-topbar">
        <Link to="/home-preview" aria-label="Voltar para a home">
          <img
            src="/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png"
            alt="WS Gestão Contábil"
          />
        </Link>
        <Link to="/login">Já tenho uma conta</Link>
      </header>
      <section className="signup-chooser-shell">
        <div className="signup-chooser-intro">
          <span>ESCOLHA SEU PRÓXIMO PASSO</span>
          <h1>O que você quer resolver hoje?</h1>
          <p>
            Escolha uma opção. Nos sistemas, você cria a conta e conhece o produto por 7 dias antes
            da primeira cobrança.
          </p>
          <small>Pagamento e dados de cartão processados com segurança pelo Mercado Pago.</small>
        </div>
        <div className="signup-chooser-options">
          <Choice
            icon={<ReceiptText />}
            number="01"
            title="Emitir notas fiscais"
            description="NF-e, NFC-e, NFS-e, CT-e e MDF-e sem limite de emissões."
            to="/cadastro?product=issuer&plan=issuer_monthly"
            action="Conhecer o Emissor"
          />
          <Choice
            icon={<FileSearch />}
            number="02"
            title="Buscar notas dos clientes"
            description="Compras, vendas e XML organizados automaticamente por empresa."
            to="/cadastro?product=extractor&plan=extractor_commercial"
            action="Conhecer o Extrator"
          />
          <a
            className="signup-choice is-service"
            href="https://wa.me/5582999324884"
            target="_blank"
            rel="noreferrer"
          >
            <span className="signup-choice-number">03</span>
            <span className="signup-choice-kicker">SERVIÇO CONTÁBIL</span>
            <Building2 />
            <span className="signup-choice-copy">
              <b>Contratar gestão contábil</b>
              <small>Fale com a equipe WS para entender sua empresa e receber uma proposta.</small>
            </span>
            <span className="signup-choice-action">
              Conversar com a WS <ArrowRight />
            </span>
          </a>
        </div>
      </section>
    </main>
  );
}

function Choice({
  icon,
  number,
  title,
  description,
  to,
  action,
}: {
  icon: ReactNode;
  number: string;
  title: string;
  description: string;
  to: string;
  action: string;
}) {
  return (
    <Link className="signup-choice" to={to}>
      <span className="signup-choice-number">{number}</span>
      <span className="signup-choice-kicker">SISTEMA PARA ESCRITÓRIOS E EMPRESAS</span>
      {icon}
      <span className="signup-choice-copy">
        <b>{title}</b>
        <small>{description}</small>
      </span>
      <span className="signup-choice-action">
        {action} <ArrowRight />
      </span>
    </Link>
  );
}
