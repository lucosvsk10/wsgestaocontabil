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
          className="flex h-11 w-full items-center justify-between border border-black/15 bg-white px-3 text-left text-sm transition-colors hover:border-black/35 dark:border-white/15 dark:bg-[#151618] dark:hover:border-white/35"
        >
          <span className={selectedClientId ? 'font-medium' : 'text-black/45 dark:text-white/45'}>
            {selectedClientName || 'Selecione uma empresa'}
          </span>
          <span aria-hidden="true" className="ml-3 text-[10px] text-black/40 dark:text-white/40">
            ABRIR
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(440px,calc(100vw-2rem))] overflow-hidden rounded-none border-black/15 p-0 shadow-xl dark:border-white/15"
        align="start"
      >
        <ClientStatusList selectedClientId={selectedClientId} onSelectClient={handleSelect} />
      </PopoverContent>
    </Popover>
  );
};
