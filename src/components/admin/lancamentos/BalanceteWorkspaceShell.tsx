import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { BalanceteWorkspaceV2 } from "./BalanceteWorkspaceV2";

type Operation = "import" | "correction" | null;

export function BalanceteWorkspaceShell() {
  const [operation, setOperation] = useState<Operation>(null);
  const [completed, setCompleted] = useState<string | null>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    let previous: Operation = null;
    let timer: number | undefined;
    const detect = () => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const importing = buttons.some(button => button.textContent?.includes("Lendo Saldo Anterior"));
      const correcting = buttons.some(button => button.textContent?.includes("Recalculando saldos"));
      const next: Operation = importing ? "import" : correcting ? "correction" : null;

      if (next && previous !== next) {
        startedAt.current = Date.now();
        setCompleted(null);
        setOperation(next);
      }
      if (!next && previous) {
        const label = previous === "import" ? "Importação do Balancete concluída" : "Análise de correção concluída";
        setOperation(null);
        setCompleted(label);
        window.clearTimeout(timer);
        timer = window.setTimeout(() => setCompleted(null), 5500);
      }
      previous = next;
    };

    const observer = new MutationObserver(detect);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    const interval = window.setInterval(detect, 250);
    detect();
    return () => {
      observer.disconnect();
      window.clearInterval(interval);
      window.clearTimeout(timer);
    };
  }, []);

  return <>
    <BalanceteWorkspaceV2 />
    {(operation || completed) && <BalanceteProcessingPopup operation={operation} completed={completed} startedAt={startedAt.current} />}
  </>;
}

function BalanceteProcessingPopup({ operation, completed, startedAt }: { operation: Operation; completed: string | null; startedAt: number }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!operation) return;
    const id = window.setInterval(() => tick(value => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [operation]);

  const seconds = operation && startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0;
  const elapsed = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return <div className="fixed bottom-5 right-5 z-[120] w-[min(390px,calc(100vw-2rem))] rounded-lg border border-border bg-background p-4 shadow-2xl">
    <div className="flex items-start gap-3">
      {operation ? <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-cyan-600" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{operation === "import" ? "Importando Balancete" : operation === "correction" ? "Analisando e corrigindo Balancete" : completed}</p>
        {operation ? <>
          <p className="mt-1 text-xs text-muted-foreground">O documento e os saldos estão sendo processados. Você pode continuar navegando pelo site.</p>
          <p className="mt-2 text-xs tabular-nums text-muted-foreground">Tempo decorrido: {elapsed}</p>
        </> : <p className="mt-1 text-xs text-muted-foreground">Os dados da competência foram atualizados. Confira o Balancete e os lançamentos sugeridos.</p>}
      </div>
    </div>
  </div>;
}
