
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, File, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { FileItemProps } from '@/types/upload';

export const FileItem: React.FC<FileItemProps> = ({
  file,
  updateFileField,
  updateFileExpirationDate,
  removeFile,
  documentCategories,
  useGlobalSettings
}) => {
  return (
    <Card key={file.id} className="border border-gray-200 dark:border-navy-lighter/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <File className="h-5 w-5 text-navy dark:text-gold mr-2" />
            <span className="font-medium text-sm text-navy dark:text-white">{file.name}</span>
          </div>
          
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => removeFile(file.id)}
            className="h-8 w-8 p-0 text-red-500 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor={`name-${file.id}`} className="text-navy dark:text-gold">Nome do documento</Label>
            <Input
              id={`name-${file.id}`}
              value={file.documentName || ''}
              onChange={(e) => updateFileField(file.id, 'documentName', e.target.value)}
              placeholder="Nome do documento"
              className="bg-white dark:bg-navy/80 border-gray-300 dark:border-navy-lighter/50"
              required
            />
          </div>
          
          {!useGlobalSettings && (
            <>
              <div>
                <Label htmlFor={`category-${file.id}`} className="text-navy dark:text-gold">Categoria</Label>
                <Select 
                  value={file.documentCategory || documentCategories[0]} 
                  onValueChange={(value) => updateFileField(file.id, 'documentCategory', value)}
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
                <Label htmlFor={`observations-${file.id}`} className="text-navy dark:text-gold">Observações</Label>
                <Textarea 
                  id={`observations-${file.id}`}
                  value={file.documentObservations || ''}
                  onChange={(e) => updateFileField(file.id, 'documentObservations', e.target.value)}
                  placeholder="Observações sobre este documento"
                  className="bg-white dark:bg-navy/80 border-gray-300 dark:border-navy-lighter/50"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id={`noExpiration-${file.id}`}
                    checked={file.expirationDate === null}
                    onCheckedChange={(checked) => updateFileExpirationDate(file.id, checked ? null : new Date())}
                    className="text-navy dark:text-gold data-[state=checked]:bg-navy dark:data-[state=checked]:bg-gold data-[state=checked]:text-white"
                  />
                  <Label htmlFor={`noExpiration-${file.id}`} className="text-sm text-navy dark:text-gold">
                    Sem data de expiração
                  </Label>
                </div>
                
                {file.expirationDate !== null && (
                  <div>
                    <Label htmlFor={`expiration-${file.id}`} className="text-navy dark:text-gold">Data de expiração</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id={`expiration-${file.id}`}
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-white dark:bg-navy/80 border-gray-300 dark:border-navy-lighter/50",
                            !file.expirationDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {file.expirationDate ? format(file.expirationDate, "PPP") : "Selecione uma data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={file.expirationDate || undefined}
                          onSelect={(date) => updateFileExpirationDate(file.id, date)}
                          initialFocus
                          disabled={(date) => date < new Date()}
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
