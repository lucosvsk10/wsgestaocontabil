import { Check, ChevronDown, PanelsTopLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  adminEnvironments,
  getAdminEnvironment,
  type AdminEnvironmentId,
} from '@/config/adminEnvironments';

export function AdminEnvironmentSwitcher({
  environment,
  compact = false,
}: {
  environment: AdminEnvironmentId;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const current = getAdminEnvironment(environment);
  const CurrentIcon = current.icon;

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="mx-auto grid h-11 w-11 place-items-center rounded-xl border border-border/70 bg-card text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
            aria-label="Trocar ambiente"
            title={`Ambiente ${current.shortLabel}`}
          >
            <CurrentIcon className="h-5 w-5" style={{ color: current.accent }} strokeWidth={1.8} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-72 p-2">
          <DropdownMenuLabel className="px-3 py-2 text-[10px] uppercase tracking-[.14em] text-muted-foreground">
            Ambientes WS
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {adminEnvironments.map(item => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem
                key={item.id}
                onSelect={() => navigate(item.route)}
                className="gap-3 rounded-lg px-3 py-3"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: item.soft }}>
                  <Icon className="h-4 w-4" style={{ color: item.accent }} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm font-medium">{item.shortLabel}</strong>
                  <span className="block truncate text-[11px] text-muted-foreground">{item.summary}</span>
                </span>
                {item.id === environment && <Check className="h-4 w-4 text-muted-foreground" />}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => navigate('/admin/ambientes')}
            className="gap-3 rounded-lg px-3 py-2.5 text-muted-foreground"
          >
            <PanelsTopLeft className="h-4 w-4" />
            Central de ambientes
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="mx-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-xl border border-border/70 bg-card/80 px-3 py-3 text-left transition hover:bg-muted/35"
          aria-label="Trocar ambiente"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: current.soft }}>
            <CurrentIcon className="h-5 w-5" style={{ color: current.accent }} strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <small className="block text-[9px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
              Ambiente
            </small>
            <strong className="mt-0.5 block truncate text-sm font-semibold">{current.shortLabel}</strong>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-72 p-2">
        <DropdownMenuLabel className="px-3 py-2 text-[10px] uppercase tracking-[.14em] text-muted-foreground">
          Trocar ambiente
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {adminEnvironments.map(item => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={item.id}
              onSelect={() => navigate(item.route)}
              className="gap-3 rounded-lg px-3 py-3"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: item.soft }}>
                <Icon className="h-4 w-4" style={{ color: item.accent }} strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm font-medium">{item.shortLabel}</strong>
                <span className="block truncate text-[11px] text-muted-foreground">{item.summary}</span>
              </span>
              {item.id === environment && <Check className="h-4 w-4 text-muted-foreground" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => navigate('/admin/ambientes')}
          className="gap-3 rounded-lg px-3 py-2.5 text-muted-foreground"
        >
          <PanelsTopLeft className="h-4 w-4" />
          Central de ambientes
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}