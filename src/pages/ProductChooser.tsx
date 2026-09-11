import { FileCheck2, Files } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '@/styles/product-chooser.css';
import '@/styles/shared-entry-visual.css';

export default function ProductChooser() {
  const navigate = useNavigate();

  return (
    <main className="product-chooser">
      <section aria-labelledby="product-chooser-title">
        <header>
          <p>WS Gestão Contábil</p>
          <h1 id="product-chooser-title">Qual produto você deseja acessar?</h1>
          <span>Você tem acesso a mais de um produto. Escolha o ambiente para continuar.</span>
        </header>
        <div className="product-choice-grid">
          <button type="button" onClick={() => navigate('/app')}>
            <FileCheck2 aria-hidden="true" />
            <strong>Emissor Fiscal</strong>
            <span>Emissão e gestão de documentos fiscais.</span>
            <b>Acessar emissor</b>
          </button>
          <button type="button" onClick={() => navigate('/extrator')}>
            <Files aria-hidden="true" />
            <strong>Extrator Fiscal</strong>
            <span>Compras, vendas, XML e relatórios por empresa.</span>
            <b>Acessar extrator</b>
          </button>
        </div>
      </section>
    </main>
  );
}
