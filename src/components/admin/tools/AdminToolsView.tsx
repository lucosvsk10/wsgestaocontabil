import { ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminToolsView = () => {
  const navigate = useNavigate();
  const tools = [
    { area: 'Cálculos', title: 'Simulador de IRPF', description: 'Estimativa de imposto de renda para pessoa física.', path: '/simulador-irpf' },
    { area: 'Cálculos', title: 'Calculadora de INSS', description: 'Contribuições previdenciárias por categoria.', path: '/calculadora-inss' },
    { area: 'Cálculos', title: 'Simulador de pró-labore', description: 'Cálculo de valor líquido, INSS e IRRF.', path: '/simulador-prolabore' },
    { area: 'Conteúdo', title: 'Carrossel institucional', description: 'Empresas e marcas exibidas na página principal.', path: '/admin/carousel' },
    { area: 'Relacionamento', title: 'Gerador de enquetes', description: 'Consultas e formulários destinados aos clientes.', path: '/admin/polls' },
    { area: 'Documentos', title: 'Documentos por empresa', description: 'Acesso aos arquivos e categorias de cada cliente.', path: '/admin/users' },
    { area: 'Histórico', title: 'Simulações realizadas', description: 'Consultas anteriores de IRPF, INSS e pró-labore.', path: '/admin/simulations' },
  ];

  return <div className="admin-page">
    <header className="admin-page-header"><div><p className="admin-eyebrow">Recursos do escritório</p><h1 className="admin-title">Ferramentas</h1><p className="admin-subtitle">Acesse utilitários de cálculo, comunicação e gestão sem sair do ambiente administrativo.</p></div></header>
    <section className="admin-surface">
      <div className="admin-surface-header"><div><h2 className="admin-section-title">Recursos disponíveis</h2><p className="admin-section-description">{tools.length} ferramentas organizadas por área de uso.</p></div></div>
      <div className="divide-y divide-[var(--admin-line)]">
        {tools.map(tool => <button key={tool.title} type="button" onClick={() => navigate(tool.path)} className="group grid w-full gap-2 px-4 py-3.5 text-left hover:bg-[var(--admin-blue-soft)] sm:grid-cols-[130px_220px_1fr_70px] sm:items-center"><span className="text-[10px] font-bold uppercase tracking-[0.07em] text-blue-600 dark:text-blue-400">{tool.area}</span><span className="text-xs font-semibold text-[var(--admin-ink)]">{tool.title}</span><span className="text-[11px] text-[var(--admin-muted)]">{tool.description}</span><span className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--admin-muted)] group-hover:text-blue-600">Abrir <ArrowUpRight className="h-3.5 w-3.5" /></span></button>)}
      </div>
    </section>
  </div>;
};
