
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import React from "react";

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
  setExpirationDate,
}: DocumentExpirationFieldsProps) => {
  const handleCheckboxChange = (checked: boolean) => {
    setNoExpiration(checked);
    if (checked) {
      setExpirationDate(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="no-expiration"
            checked={noExpiration}
            onCheckedChange={handleCheckboxChange}
            className="border-gray-300 dark:border-gold/30 data-[state=checked]:bg-navy data-[state=checked]:border-navy dark:data-[state=checked]:bg-gold dark:data-[state=checked]:border-gold"
          />
          <label
            htmlFor="no-expiration"
            className="text-sm font-medium text-gray-700 dark:text-gray-200 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Este documento não tem data de expiração
          </label>
        </div>
      </div>

      {!noExpiration && (
        <div>
          <Label htmlFor="date" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Data de Expiração
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal mt-1 border-gray-300 dark:border-gold/20 hover:bg-gray-100 dark:hover:bg-navy-light/30 dark:bg-navy-dark dark:text-white",
                  !expirationDate && "text-gray-400 dark:text-gray-400"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {expirationDate ? (
                  format(expirationDate, "dd/MM/yyyy")
                ) : (
                  <span>Selecione uma data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20">
              <Calendar
                mode="single"
                selected={expirationDate || undefined}
                onSelect={setExpirationDate}
                initialFocus
                className="p-3 pointer-events-auto dark:bg-navy-dark dark:text-white"
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
};
