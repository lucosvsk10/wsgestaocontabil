
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
import { Calendar as CalendarIcon, FileText, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { FileItemProps } from '@/types/upload';
import { Badge } from '@/components/ui/badge';

export const FileItem: React.FC<FileItemProps> = ({
  file,
  updateFileField,
  updateFileExpirationDate,
  removeFile,
  documentCategories,
  useGlobalSettings
}) => {
  // Format the file size in a human-readable format
  const formatFileSize = (sizeInBytes: number): string => {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card key={file.id} className="border border-gray-200 dark:border-navy-lighter/30 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center overflow-hidden gap-2">
            <FileText className="h-5 w-5 text-navy dark:text-gold flex-shrink-0" />
            <span className="font-medium truncate text-navy-dark dark:text-gold">
              {file.name}
            </span>
            <Badge variant="outline" className="text-xs font-normal text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700">
              {formatFileSize(file.size)}
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => removeFile(file.id)} 
            className="p-1 h-8 w-8 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`name-${file.id}`} className="text-navy dark:text-gold">Nome do documento</Label>
            <Input
              id={`name-${file.id}`}
              value={file.documentName || ''}
              onChange={(e) => updateFileField(file.id, 'documentName', e.target.value)}
              disabled={useGlobalSettings}
              placeholder="Nome do documento"
              className="bg-white dark:bg-navy/80 border-gray-300 dark:border-navy-lighter/50 mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor={`category-${file.id}`} className="text-navy dark:text-gold">Categoria</Label>
            <Select 
              value={file.documentCategory || ''} 
              onValueChange={(value) => updateFileField(file.id, 'documentCategory', value)}
              disabled={useGlobalSettings}
            >
              <SelectTrigger 
                id={`category-${file.id}`} 
                className="bg-white dark:bg-navy/80 border-gray-300 dark:border-navy-lighter/50 mt-1"
              >
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {documentCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="mt-3">
          <Label htmlFor={`observations-${file.id}`} className="text-navy dark:text-gold">Observações</Label>
          <Textarea 
            id={`observations-${file.id}`}
            value={file.documentObservations || ''}
            onChange={(e) => updateFileField(file.id, 'documentObservations', e.target.value)}
            disabled={useGlobalSettings}
            placeholder="Observações sobre este documento"
            className="bg-white dark:bg-navy/80 border-gray-300 dark:border-navy-lighter/50 mt-1 resize-none"
            rows={2}
          />
        </div>
        
        <div className="mt-3">
          {!useGlobalSettings && (
            <div className="flex items-center space-x-2 mb-2">
              <Checkbox 
                id={`no-expiration-${file.id}`}
                checked={file.expirationDate === null}
                onCheckedChange={(checked) => {
                  if (checked) {
                    updateFileExpirationDate(file.id, null);
                  } else {
                    updateFileExpirationDate(file.id, new Date());
                  }
                }}
                className="text-navy dark:text-gold data-[state=checked]:bg-navy dark:data-[state=checked]:bg-gold data-[state=checked]:text-white"
                disabled={useGlobalSettings}
              />
              <Label htmlFor={`no-expiration-${file.id}`} className="text-sm text-navy dark:text-gold cursor-pointer">
                Documento sem expiração
              </Label>
            </div>
          )}
          
          {!useGlobalSettings && file.expirationDate !== null && (
            <div>
              <Label htmlFor={`expiration-date-${file.id}`} className="text-navy dark:text-gold">Data de expiração</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id={`expiration-date-${file.id}`}
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-white dark:bg-navy/80 border-gray-300 dark:border-navy-lighter/50 mt-1",
                      !file.expirationDate && "text-muted-foreground"
                    )}
                    disabled={useGlobalSettings}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {file.expirationDate ? format(file.expirationDate, "dd/MM/yyyy") : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white dark:bg-navy-deeper">
                  <Calendar
                    mode="single"
                    selected={file.expirationDate || undefined}
                    onSelect={(date) => updateFileExpirationDate(file.id, date)}
                    initialFocus
                    disabled={(date) => date < new Date()}
                    className="rounded-md border border-gray-200 dark:border-navy-lighter/30"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
