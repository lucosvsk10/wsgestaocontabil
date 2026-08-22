import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  description?: string;
  actionLabel: string;
  disabled?: boolean;
  busy?: boolean;
  done?: boolean;
  onAction: () => void;
}

export function ConferenceActionBar({ title, description, actionLabel, disabled, busy, done, onAction }: Props) {
  return <div className="flex flex-col gap-3 border-b border-border bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <div className="flex items-center gap-2"><h3 className="text-sm font-semibold text-foreground">{title}</h3>{done && <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Concluído</span>}</div>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    </div>
    <Button type="button" className="shrink-0" disabled={disabled || busy} onClick={onAction}>{busy ? "Processando..." : actionLabel}</Button>
  </div>;
}
