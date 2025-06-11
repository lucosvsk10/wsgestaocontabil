
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Settings } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DocumentCategory } from "@/types/admin";

interface DocumentMetadataFormProps {
  documentName: string;
  setDocumentName: (name: string) => void;
  documentCategory: string;
  setDocumentCategory: (category: string) => void;
  documentSubcategory: string;
  setDocumentSubcategory: (subcategory: string) => void;
  documentObservations: string;
  setDocumentObservations: (observations: string) => void;
  expirationDate: Date | null;
  setExpirationDate: (date: Date | null) => void;
  noExpiration: boolean;
  setNoExpiration: (noExpiration: boolean) => void;
  categories: DocumentCategory[];
  isUploading: boolean;
  onOpenCategoryModal: () => void;
}

export const DocumentMetadataForm: React.FC<DocumentMetadataFormProps> = ({
  documentName,
  setDocumentName,
  documentCategory,
  setDocumentCategory,
  documentSubcategory,
  setDocumentSubcategory,
  documentObservations,
  setDocumentObservations,
  expirationDate,
  setExpirationDate,
  noExpiration,
  setNoExpiration,
  categories,
  isUploading,
  onOpenCategoryModal
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <div>
        <Label htmlFor="documentName" className="text-[#020817] dark:text-gray-300">
          Nome do Documento*
        </Label>
        <Input 
          id="documentName" 
          value={documentName} 
          onChange={e => setDocumentName(e.target.value)} 
          placeholder="Nome que será exibido para o cliente" 
          className="mt-1 border-[#e6e6e6] dark:border-navy-lighter/40 bg-white dark:bg-navy-light/20 dark:text-white" 
          disabled={isUploading} 
          required 
        />
      </div>

      <div>
        <div className="flex justify-between items-center">
          <Label htmlFor="documentCategory" className="text-[#020817] dark:text-gray-300">
            Categoria*
          </Label>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            className="h-8 text-[#6b7280] hover:text-[#020817] dark:hover:text-gold" 
            onClick={onOpenCategoryModal}
          >
            <Settings className="h-4 w-4 mr-1" />
            Gerenciar
          </Button>
        </div>
        <select 
          id="documentCategory" 
          value={documentCategory} 
          onChange={e => setDocumentCategory(e.target.value)} 
          className="mt-1 w-full rounded-md border-[#e6e6e6] dark:border-navy-lighter/40 bg-white dark:bg-navy-dark text-[#020817] dark:text-white" 
          disabled={isUploading} 
          required
        >
          <option value="">Selecione uma categoria</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="documentSubcategory" className="text-gray-700 dark:text-gray-300">
          Subcategoria (opcional)
        </Label>
        <Input 
          id="documentSubcategory" 
          value={documentSubcategory} 
          onChange={e => setDocumentSubcategory(e.target.value)} 
          placeholder="Ex: Termo de aceite, Contra-cheque, etc" 
          className="mt-1 border-gray-300 dark:border-navy-lighter/40 bg-white dark:bg-navy-light/20 dark:text-white" 
          disabled={isUploading} 
        />
      </div>

      <div>
        <Label htmlFor="documentExpiration" className="text-gray-700 dark:text-gray-300">
          Data de Expiração (opcional)
        </Label>
        <div className="flex items-center mt-1 space-x-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "w-full justify-start text-left font-normal border-gray-300 dark:border-navy-lighter/40 bg-white dark:bg-navy-light/20", 
                  !expirationDate && !noExpiration && "text-gray-500 dark:text-gray-400"
                )} 
                disabled={isUploading || noExpiration}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {expirationDate ? format(expirationDate, "PPP", { locale: ptBR }) : "Selecione uma data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white dark:bg-navy-deeper">
              <Calendar 
                mode="single" 
                selected={expirationDate || undefined} 
                onSelect={setExpirationDate} 
                initialFocus 
                disabled={date => date < new Date()} 
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
            onChange={e => {
              setNoExpiration(e.target.checked);
              if (e.target.checked) setExpirationDate(null);
            }} 
            className="rounded border-gray-300 dark:border-navy-lighter/40" 
            disabled={isUploading} 
          />
          <label htmlFor="noExpiration" className="ml-2 text-sm text-gray-600 dark:text-gray-300">
            Sem data de expiração
          </label>
        </div>
      </div>

      <div className="md:col-span-2">
        <Label htmlFor="documentObservations" className="text-gray-700 dark:text-gray-300">
          Observações (opcional)
        </Label>
        <Textarea 
          id="documentObservations" 
          value={documentObservations} 
          onChange={e => setDocumentObservations(e.target.value)} 
          placeholder="Informações adicionais sobre o documento" 
          className="mt-1 border-gray-300 dark:border-navy-lighter/40 bg-white dark:bg-navy-light/20 dark:text-white" 
          disabled={isUploading} 
          rows={3} 
        />
      </div>
    </div>
  );
};
