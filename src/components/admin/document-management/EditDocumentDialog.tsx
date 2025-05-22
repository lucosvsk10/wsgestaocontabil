
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Document, DocumentCategory } from '@/types/common';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

interface EditDocumentDialogProps {
  open: boolean;
  document: Document | null;
  categories: DocumentCategory[];
  onClose: () => void;
  onSave: (document: Document) => Promise<void>;
}

export const EditDocumentDialog: React.FC<EditDocumentDialogProps> = ({
  open,
  document,
  categories,
  onClose,
  onSave
}) => {
  const [documentName, setDocumentName] = useState('');
  const [documentCategory, setDocumentCategory] = useState('');
  const [documentSubcategory, setDocumentSubcategory] = useState('');
  const [documentObservations, setDocumentObservations] = useState('');
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [noExpiration, setNoExpiration] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Carregar dados do documento quando abrir o diálogo
  useEffect(() => {
    if (document) {
      setDocumentName(document.name || '');
      setDocumentCategory(document.category || '');
      setDocumentSubcategory(document.subcategory || '');
      setDocumentObservations(document.observations || '');
      
      if (document.expires_at && !noExpiration) {
        setExpirationDate(new Date(document.expires_at));
      } else {
        setExpirationDate(null);
      }
      
      setNoExpiration(!document.expires_at);
    }
  }, [document]);

  const handleSave = async () => {
    if (!document) return;
    
    try {
      setIsSaving(true);
      
      // Atualizar o documento com novos dados
      const updatedDocument: Document = {
        ...document,
        name: documentName,
        category: documentCategory,
        subcategory: documentSubcategory,
        observations: documentObservations,
        expires_at: noExpiration ? null : expirationDate ? expirationDate.toISOString() : null
      };
      
      await onSave(updatedDocument);
      onClose();
    } catch (error) {
      console.error('Error saving document:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-navy-dark">
        <DialogHeader>
          <DialogTitle className="text-navy-dark dark:text-gold">Editar Documento</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            Modifique as informações do documento abaixo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="documentName" className="text-navy-dark dark:text-gold">
              Nome do Documento
            </Label>
            <Input
              id="documentName"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              className="border-gray-300 dark:border-gray-700 dark:bg-navy-light/30"
              required
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="documentCategory" className="text-navy-dark dark:text-gold">
              Categoria
            </Label>
            <select
              id="documentCategory"
              value={documentCategory}
              onChange={(e) => setDocumentCategory(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-navy-light/30 dark:text-white"
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="documentSubcategory" className="text-navy-dark dark:text-gold">
              Subcategoria (opcional)
            </Label>
            <Input
              id="documentSubcategory"
              value={documentSubcategory}
              onChange={(e) => setDocumentSubcategory(e.target.value)}
              className="border-gray-300 dark:border-gray-700 dark:bg-navy-light/30"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="documentExpiration" className="text-navy-dark dark:text-gold">
              Data de Expiração (opcional)
            </Label>
            <div className="flex items-center space-x-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-gray-300 dark:border-gray-700 dark:bg-navy-light/30",
                      !expirationDate && !noExpiration && "text-gray-500 dark:text-gray-400"
                    )}
                    disabled={noExpiration}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expirationDate ? (
                      format(expirationDate, "PPP", { locale: ptBR })
                    ) : (
                      "Selecione uma data"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white dark:bg-navy-deeper">
                  <Calendar
                    mode="single"
                    selected={expirationDate || undefined}
                    onSelect={setExpirationDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                    className="bg-white dark:bg-navy-deeper"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                id="noExpiration"
                checked={noExpiration}
                onChange={(e) => {
                  setNoExpiration(e.target.checked);
                  if (e.target.checked) setExpirationDate(null);
                }}
                className="rounded border-gray-300 dark:border-gray-700"
              />
              <label htmlFor="noExpiration" className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                Sem data de expiração
              </label>
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="documentObservations" className="text-navy-dark dark:text-gold">
              Observações (opcional)
            </Label>
            <Textarea
              id="documentObservations"
              value={documentObservations}
              onChange={(e) => setDocumentObservations(e.target.value)}
              className="border-gray-300 dark:border-gray-700 dark:bg-navy-light/30"
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !documentName || !documentCategory} 
            className="bg-gold hover:bg-gold/90 text-navy dark:text-navy-dark"
          >
            {isSaving ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
