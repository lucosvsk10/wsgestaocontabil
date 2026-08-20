interface LancamentoModulesGridProps {
  disabled: boolean;
  onOpenDespesas: () => void;
  onOpenFolha: () => void;
  onOpenCompras: () => void;
  onOpenFaturamento: () => void;
  onOpenTributos: () => void;
  onOpenBalancete: () => void;
}

export const LancamentoModulesGrid = ({
  disabled,
  onOpenDespesas,
  onOpenFolha,
  onOpenCompras,
  onOpenFaturamento,
  onOpenTributos,
  onOpenBalancete,
}: LancamentoModulesGridProps) => {
  const modules = [
    {
      step: '01',
      title: 'Despesas e pagamentos',
      description: 'Despesas administrativas, fornecedores e demais documentos livres.',
      result: 'Classificação e partidas',
      onClick: onOpenDespesas,
    },
    {
      step: '02',
      title: 'Compras',
      description: 'Entradas, CFOP e mercadorias destinadas à revenda.',
      result: 'Compras por competência',
      onClick: onOpenCompras,
    },
    {
      step: '03',
      title: 'Faturamento',
      description: 'Prestação de serviços e revenda de mercadorias.',
      result: 'Receitas e clientes',
      onClick: onOpenFaturamento,
    },
    {
      step: '04',
      title: 'Folha de pagamento',
      description: 'Salários, pró-labore, férias, décimo terceiro e encargos.',
      result: 'Folha e obrigações',
      onClick: onOpenFolha,
    },
    {
      step: '05',
      title: 'Tributos',
      description: 'PGDAS, Simples Nacional e obrigações apuradas na competência.',
      result: 'Impostos a recolher',
      onClick: onOpenTributos,
    },
    {
      step: '06',
      title: 'Balancete',
      description: 'Conferência de saldos, conciliação e ajustes finais da competência.',
      result: 'Validação e encerramento',
      onClick: onOpenBalancete,
    },
  ];

  return (
    <section className="admin-surface">
      <div className="admin-surface-header">
        <div><h2 className="admin-section-title">Fluxo da competência</h2><p className="admin-section-description">Execute as etapas, confira os resultados e finalize no balancete.</p></div>
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--admin-muted)]">6 etapas</span>
      </div>
      <div className="divide-y divide-[var(--admin-line)]">
        {modules.map(module => (
          <button
            key={module.title}
            type="button"
            disabled={disabled}
            onClick={module.onClick}
            className="group grid w-full gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--admin-blue-soft)] disabled:cursor-not-allowed disabled:opacity-40 sm:grid-cols-[42px_210px_minmax(240px,1fr)_190px_64px] sm:items-center"
          >
            <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">{module.step}</span>
            <span className="text-xs font-semibold text-[var(--admin-ink)]">{module.title}</span>
            <span className="text-[11px] leading-relaxed text-[var(--admin-muted)]">
              {module.description}
            </span>
            <span className="text-[10px] font-medium text-[var(--admin-muted)]">Saída: {module.result}</span>
            <span className="text-right text-[10px] font-bold uppercase tracking-[0.07em] text-blue-600 group-hover:text-blue-700 dark:text-blue-400">
              Abrir →
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};
