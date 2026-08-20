import { useState } from 'react';
import { Building2, CheckCircle2, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ClientStatusList } from './ClientStatusList';

interface CompanySelectorTopProps {
  selectedClientId: string | null;
  selectedClientName: string | null;
  onSelectClient: (clientId: string) => void;
}

export const CompanySelectorTop = ({
  selectedClientId,
  selectedClientName,
  onSelectClient,
}: CompanySelectorTopProps) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (clientId: string) => {
    onSelectClient(clientId);
    setOpen(false);
  };

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="group flex min-h-[72px] w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left transition-all hover:border-[#d7aa2f]/60 hover:bg-white dark:border-white/10 dark:bg-white/[0.035] dark:hover:border-[#efc349]/50 dark:hover:bg-white/[0.055]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#101a2a] text-[#efc349]">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Empresa de trabalho
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
                {selectedClientName || 'Selecionar empresa'}
              </p>
            </div>
            {selectedClientId && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-2xl border-slate-200 p-0 shadow-2xl dark:border-white/10"
          align="start"
        >
          <ClientStatusList selectedClientId={selectedClientId} onSelectClient={handleSelect} />
        </PopoverContent>
      </Popover>
    </div>
  );
};
