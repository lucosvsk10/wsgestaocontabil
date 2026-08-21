import { Info } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

export interface WorkflowStep {
  value: string;
  label: string;
  count: number;
}

export function AccountingWorkflowSteps({ steps, className }: { steps: WorkflowStep[]; className?: string }) {
  return <div className={cn("overflow-x-auto pb-1", className)}>
    <TabsList className="inline-flex h-auto min-w-max items-center gap-1 rounded-xl border border-border bg-muted/35 p-1 shadow-sm">
      {steps.map((step, index) => <TabsTrigger
        key={step.value}
        value={step.value}
        className="group h-9 rounded-lg border-0 bg-transparent px-2.5 text-xs font-medium text-muted-foreground shadow-none transition-all hover:bg-background/70 hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
      >
        <span className="mr-2 grid h-5 w-5 place-items-center rounded-full border border-border bg-background text-[10px] font-semibold tabular-nums text-muted-foreground transition-colors group-data-[state=active]:border-foreground group-data-[state=active]:bg-foreground group-data-[state=active]:text-background">
          {index + 1}
        </span>
        <span>{step.label}</span>
        <span className="ml-2 min-w-5 rounded-full bg-muted px-1.5 py-0.5 text-center text-[10px] tabular-nums text-muted-foreground">
          {step.count}
        </span>
      </TabsTrigger>)}
    </TabsList>
  </div>;
}

export function AccountCodeHover({
  code,
  description,
  side,
  children,
  className,
}: {
  code: string;
  description: string;
  side: "debit" | "credit";
  children?: React.ReactNode;
  className?: string;
}) {
  const label = side === "debit" ? "Conta de débito" : "Conta de crédito";
  const safeDescription = description || "Descrição não encontrada no plano de contas";

  return <HoverCard openDelay={70} closeDelay={80}>
    <HoverCardTrigger asChild>
      {children ?? <span className={cn("inline-flex cursor-help items-center gap-1.5 rounded-md px-1.5 py-0.5 font-medium tabular-nums transition-colors hover:bg-muted", className)}>
        <span>{code || "—"}</span>
        {code && <Info className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}
      </span>}
    </HoverCardTrigger>
    <HoverCardContent align="start" side="top" sideOffset={8} className="w-72 overflow-hidden rounded-xl border-border bg-popover p-0 shadow-xl">
      <div className="border-b border-border bg-muted/40 px-3.5 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="rounded-md bg-foreground px-2 py-1 text-xs font-semibold tabular-nums text-background">C.R. {code || "—"}</span>
          <span className="text-[11px] text-muted-foreground">Código reduzido</span>
        </div>
      </div>
      <div className="px-3.5 py-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Descrição da conta</p>
        <p className="mt-1 text-sm font-medium leading-snug text-foreground">{safeDescription}</p>
      </div>
    </HoverCardContent>
  </HoverCard>;
}
