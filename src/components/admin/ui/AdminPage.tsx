import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function AdminPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-5 sm:py-6 lg:px-8', className)}>{children}</div>;
}

export function AdminPageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function AdminSection({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('overflow-hidden rounded-2xl border border-border/55 bg-card text-card-foreground shadow-sm', className)}>{children}</section>;
}

export function AdminToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-muted/15 p-4', className)}>{children}</div>;
}

export function AdminEmptyState({ icon, title, description }: { icon?: ReactNode; title: string; description?: string }) {
  return <div className="px-5 py-14 text-center">{icon && <div className="mx-auto mb-3 flex w-fit items-center justify-center text-muted-foreground">{icon}</div>}<p className="font-medium">{title}</p>{description && <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>}</div>;
}

export function AdminLoadingState({ label = 'Carregando...' }: { label?: string }) {
  return <div className="px-5 py-12 text-center text-sm text-muted-foreground">{label}</div>;
}
