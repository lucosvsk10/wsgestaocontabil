import { useEffect } from 'react';
import { ArrowRight, Calculator, CircleDollarSign, Landmark, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicSiteFooter from '@/components/public/PublicSiteFooter';
import '../styles/public-content.css';
import '../styles/public-hubs.css';

const simulations = [
  { icon: Calculator, title: 'Simulador de IRPF', text: 'Faça uma estimativa inicial e organize as informações antes de tomar uma decisão.', to: '/simulador-irpf' },
  { icon: Landmark, title: 'Calculadora de INSS', text: 'Simule contribuições e tenha uma referência rápida para planejamento.', to: '/calculadora-inss' },
  { icon: CircleDollarSign, title: 'Simulador de pró-labore', text: 'Compare cenários de retirada e visualize os principais valores envolvidos.', to: '/simulador-prolabore' },
  { icon: WalletCards, title: 'Simulações empresariais', text: 'Acesse as ferramentas WS reunidas em um ponto único para consultas rápidas.', to: '/login' },
];

export default function SimulationsHubPage() {
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, []);
  return <div className="public-page public-hub-page">
    <header className="guide-header"><Link to="/home-preview" className="guide-brand"><img src="/assets/ws-logo.png" alt="WS Gestão Contábil" /></Link><nav><Link to="/home-preview">Início</Link><Link to="/guias">Guias</Link><Link to="/login">Login</Link></nav></header>
    <main className="public-hub-main">
      <div className="public-hub-orb public-hub-orb-one" aria-hidden="true" /><div className="public-hub-orb public-hub-orb-two" aria-hidden="true" />
      <section className="public-hub-hero"><span>FERRAMENTAS WS</span><h1>Simule antes de decidir.</h1><p>Reunimos as calculadoras e simuladores da WS para você consultar cenários com mais rapidez. Os resultados servem como referência e não substituem a análise contábil do seu caso.</p></section>
      <section className="public-hub-grid" aria-label="Simulações disponíveis">{simulations.map(({ icon: Icon, title, text, to }) => <Link to={to} className="public-hub-card" key={title}><Icon /><div><h2>{title}</h2><p>{text}</p></div><strong>Abrir ferramenta <ArrowRight /></strong></Link>)}</section>
      <aside className="public-hub-note"><div><span>PRECISA IR ALÉM DA SIMULAÇÃO?</span><h2>Leve os números para uma análise real.</h2><p>A WS pode avaliar o cenário da sua empresa e indicar o próximo passo com base na sua operação.</p></div><a href="https://wa.me/5582999324884" target="_blank" rel="noreferrer">Falar com a WS <ArrowRight /></a></aside>
    </main>
    <PublicSiteFooter />
  </div>;
}
