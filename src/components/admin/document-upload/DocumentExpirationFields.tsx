
import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface DocumentExpirationFieldsProps {
  noExpiration: boolean;
  setNoExpiration: (value: boolean) => void;
  expirationDate: Date | null;
  setExpirationDate: (date: Date | null) => void;
}

export const DocumentExpirationFields = ({
  noExpiration,
  setNoExpiration,
  expirationDate,
  setExpirationDate
}: DocumentExpirationFieldsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="noExpiration" 
            checked={noExpiration} 
            onCheckedChange={(checked) => {
              if (checked) {
                setExpirationDate(null);
              }
              setNoExpiration(!!checked);
            }}
            className="border-gold/40 data-[state=checked]:bg-gold data-[state=checked]:text-navy"
          />
          <label
            htmlFor="noExpiration"
            className="text-sm font-medium leading-none text-[#e9aa91] peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Sem data de expiração
          </label>
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#e9aa91]">
          Data de Expiração
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal bg-[#393532] border-gold/20",
                !expirationDate && "text-[#e9aa91]/50",
                expirationDate && "text-white"
              )}
              disabled={noExpiration}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {expirationDate ? format(expirationDate, "PPP", { locale: ptBR }) : "Selecionar data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-[#393532] border-gold/20">
            <Calendar
              mode="single"
              selected={expirationDate || undefined}
              onSelect={setExpirationDate}
              disabled={noExpiration}
              initialFocus
              className="bg-[#393532] text-white"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
