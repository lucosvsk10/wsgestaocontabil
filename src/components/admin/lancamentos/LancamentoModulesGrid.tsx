import { motion } from "framer-motion";
import { Receipt, Wallet, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface LancamentoModulesGridProps {
  disabled: boolean;
  onOpenDespesas: () => void;
  onOpenFolha: () => void;
}

export const LancamentoModulesGrid = ({
  disabled,
  onOpenDespesas,
  onOpenFolha,
}: LancamentoModulesGridProps) => {
  const modules = [
    {
      key: "despesas",
      title: "Lançamentos de Despesas",
      description:
        "Documentos enviados pelo cliente, alinhamento e fechamento mensal.",
      icon: Receipt,
      active: true,
      onClick: onOpenDespesas,
    },
    {
      key: "folha",
      title: "Folha de Pagamento",
      description:
        "Upload de relatórios em PDF e geração automática dos lançamentos contábeis via IA.",
      icon: Wallet,
      active: true,
      onClick: onOpenFolha,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {modules.map((m, i) => {
        const Icon = m.icon;
        const isDisabled = disabled || !m.active;
        return (
          <motion.button
            key={m.key}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            disabled={isDisabled}
            onClick={m.onClick}
            className={cn(
              "group text-left p-5 rounded-xl bg-card shadow-sm transition-all",
              isDisabled
                ? "opacity-60 cursor-not-allowed"
                : "hover:shadow-md hover:-translate-y-0.5"
            )}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  m.active ? "bg-primary/10" : "bg-muted"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5",
                    m.active ? "text-primary" : "text-muted-foreground"
                  )}
                />
              </div>
              {!m.active && (
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  <Lock className="w-3 h-3" /> Em breve
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {m.title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {m.description}
            </p>
            {disabled && m.active && (
              <p className="text-[11px] text-muted-foreground mt-3 italic">
                Selecione uma empresa para acessar.
              </p>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};
