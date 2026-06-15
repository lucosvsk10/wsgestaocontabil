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
    <div className="flex justify-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="group flex items-center gap-3 px-6 py-3 rounded-xl bg-card hover:bg-muted/50 transition-all shadow-sm min-w-[280px] max-w-md"
          >
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                Empresa
              </p>
              <p className="text-sm font-medium text-foreground truncate">
                {selectedClientName || "Selecionar empresa"}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[380px] p-0" align="center">
          <ClientStatusList
            selectedClientId={selectedClientId}
            onSelectClient={handleSelect}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
