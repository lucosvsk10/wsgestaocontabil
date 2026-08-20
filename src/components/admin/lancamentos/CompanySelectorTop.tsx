import { useState } from 'react';
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-11 w-full items-center justify-between rounded-md border border-[var(--admin-line)] bg-[var(--admin-panel)] px-3 text-left text-sm transition-colors hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <span className={selectedClientId ? 'font-semibold text-[var(--admin-ink)]' : 'text-[var(--admin-muted)]'}>
            {selectedClientName || 'Selecione uma empresa'}
          </span>
          <span aria-hidden="true" className="ml-3 text-[10px] font-bold uppercase tracking-[0.06em] text-blue-600 dark:text-blue-400">
            Selecionar
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(440px,calc(100vw-2rem))] overflow-hidden rounded-lg border-[var(--admin-line)] p-0 shadow-xl"
        align="start"
      >
        <ClientStatusList selectedClientId={selectedClientId} onSelectClient={handleSelect} />
      </PopoverContent>
    </Popover>
  );
};
