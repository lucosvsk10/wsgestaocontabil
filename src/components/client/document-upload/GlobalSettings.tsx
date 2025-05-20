
import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { GlobalSettingsProps } from '@/types/upload';

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({
  globalCategory,
  setGlobalCategory,
  globalObservations,
  setGlobalObservations,
  globalExpirationDate,
  setGlobalExpirationDate,
  noExpiration,
  setNoExpiration,
  useGlobalSettings,
  setUseGlobalSettings,
  applyGlobalSettingsToAll,
  documentCategories,
  filesCount
}) => {
  return (
    <div className="mb-6 p-4 bg-gray-50 dark:bg-navy-light/10 rounded-lg border border-gray-200 dark:border-gold/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-navy dark:text-white">Configurações para todos os documentos</h3>
        <Checkbox 
          id="useGlobalSettings" 
          checked={useGlobalSettings} 
          onCheckedChange={(checked) => setUseGlobalSettings(!!checked)} 
          className="text-navy dark:text-gold data-[state=checked]:bg-navy dark:data-[state=checked]:bg-gold data-[state=checked]:text-white"
        />
      </div>
      
      {useGlobalSettings && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="globalCategory" className="text-navy dark:text-gold">Categoria</Label>
            <Select 
              value={globalCategory} 
              onValueChange={setGlobalCategory}
            >
              <SelectTrigger className="bg-white dark:bg-navy/80 border-gray-300 dark:border-navy-lighter/50">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {documentCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="globalObservations" className="text-navy dark:text-gold">Observações</Label>
            <Textarea 
              id="globalObservations"
              placeholder="Observações gerais para todos os documentos"
              value={globalObservations}
              onChange={(e) => setGlobalObservations(e.target.value)}
              className="bg-white dark:bg-navy/80 border-gray-300 dark:border-navy-lighter/50"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="noExpiration" 
                checked={noExpiration} 
                onCheckedChange={(checked) => setNoExpiration(!!checked)} 
                className="text-navy dark:text-gold data-[state=checked]:bg-navy dark:data-[state=checked]:bg-gold data-[state=checked]:text-white"
              />
              <Label htmlFor="noExpiration" className="text-sm text-navy dark:text-gold">
                Sem data de expiração
              </Label>
            </div>
            
            {!noExpiration && (
              <div>
                <Label htmlFor="expirationDate" className="text-navy dark:text-gold">Data de expiração</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="expirationDate"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-white dark:bg-navy/80 border-gray-300 dark:border-navy-lighter/50",
                        !globalExpirationDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {globalExpirationDate ? format(globalExpirationDate, "PPP") : "Selecione uma data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={globalExpirationDate || undefined}
                      onSelect={setGlobalExpirationDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
          
          {filesCount > 0 && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={applyGlobalSettingsToAll}
              className="w-full mt-4 border-navy dark:border-gold text-navy dark:text-gold hover:bg-navy hover:text-white dark:hover:bg-gold"
            >
              Aplicar configurações a todos os documentos
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
