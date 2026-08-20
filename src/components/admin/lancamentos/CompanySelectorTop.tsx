import { useState } from "react";
import { Building2, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ClientStatusList } from "./ClientStatusList";

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
    <div className="flex min-w-0">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="group flex h-11 min-w-[260px] max-w-md items-center gap-3 border border-border bg-background px-3 transition-colors hover:bg-muted/40"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-border">
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[9px] text-muted-foreground uppercase tracking-[0.12em]">
                Empresa
              </p>
              <p className="text-xs font-medium text-foreground truncate">
                {selectedClientName || "Selecionar empresa"}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[380px] p-0" align="end">
          <ClientStatusList
            selectedClientId={selectedClientId}
            onSelectClient={handleSelect}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
