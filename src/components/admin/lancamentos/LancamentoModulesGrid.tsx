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
      title: 'Despesas e pagamentos',
      description: 'Despesas administrativas, fornecedores e demais documentos livres.',
      onClick: onOpenDespesas,
    },
    {
      title: 'Compras',
      description: 'Entradas, CFOP e mercadorias destinadas à revenda.',
      onClick: onOpenCompras,
    },
    {
      title: 'Faturamento',
      description: 'Prestação de serviços e revenda de mercadorias.',
      onClick: onOpenFaturamento,
    },
    {
      title: 'Folha de pagamento',
      description: 'Salários, pró-labore, férias, décimo terceiro e encargos.',
      onClick: onOpenFolha,
    },
    {
      title: 'Tributos',
      description: 'PGDAS, Simples Nacional e obrigações apuradas na competência.',
      onClick: onOpenTributos,
    },
    {
      title: 'Balancete',
      description: 'Conferência de saldos, conciliação e ajustes finais da competência.',
      onClick: onOpenBalancete,
    },
  ];

  return (
    <section className="border border-black/15 bg-white dark:border-white/15 dark:bg-[#111214]">
      <div className="border-b border-black/10 px-5 py-4 dark:border-white/10">
        <h2 className="text-sm font-semibold">Processos contábeis</h2>
        <p className="mt-1 text-xs text-black/50 dark:text-white/45">
          Selecione o processo que deseja trabalhar.
        </p>
      </div>
      <div className="divide-y divide-black/10 dark:divide-white/10">
        {modules.map(module => (
          <button
            key={module.title}
            type="button"
            disabled={disabled}
            onClick={module.onClick}
            className="group grid w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-black/[0.025] disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/[0.025] sm:grid-cols-[220px_1fr_auto] sm:items-center"
          >
            <span className="text-sm font-medium">{module.title}</span>
            <span className="text-xs leading-relaxed text-black/50 dark:text-white/45">
              {module.description}
            </span>
            <span className="text-[10px] font-semibold tracking-[0.08em] text-black/45 group-hover:text-black dark:text-white/40 dark:group-hover:text-white">
              ABRIR
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};
