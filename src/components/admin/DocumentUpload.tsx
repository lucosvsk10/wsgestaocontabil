
import { useState } from "react";
import { PlusCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface DocumentUploadProps {
  documentName: string;
  setDocumentName: (name: string) => void;
  documentCategory: string;
  setDocumentCategory: (category: string) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpload: (e: React.FormEvent) => void;
  isUploading: boolean;
  documentCategories: string[];
  expirationDate: Date | null;
  setExpirationDate: (date: Date | null) => void;
  noExpiration: boolean;
  setNoExpiration: (value: boolean) => void;
}

export const DocumentUpload = ({
  documentName,
  setDocumentName,
  documentCategory,
  setDocumentCategory,
  handleFileChange,
  handleUpload,
  isUploading,
  documentCategories,
  expirationDate,
  setExpirationDate,
  noExpiration,
  setNoExpiration
}: DocumentUploadProps) => {
  return (
    <div className="p-4 rounded-md bg-[#46413d]">
      <h3 className="font-medium mb-4 flex items-center">
        <PlusCircle className="mr-2 h-5 w-5 text-gold" />
        Enviar Novo Documento
      </h3>
      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label htmlFor="documentName" className="block text-sm font-medium mb-1">
            Nome do Documento
          </label>
          <Input id="documentName" value={documentName} onChange={e => setDocumentName(e.target.value)} className="bg-gray-700" placeholder="Ex: Contrato de Serviço" required />
        </div>
        <div>
          <label htmlFor="documentCategory" className="block text-sm font-medium mb-1">
            Categoria
          </label>
          <Select value={documentCategory} onValueChange={setDocumentCategory}>
            <SelectTrigger className="bg-gray-700">
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              {documentCategories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="fileInput" className="block text-sm font-medium mb-1">
            Arquivo
          </label>
          <Input 
            id="fileInput" 
            type="file" 
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.rar" 
            onChange={handleFileChange} 
            className="bg-gray-700" 
            required 
          />
          <p className="text-xs mt-1 text-gray-400">
            Formatos aceitos: PDF, Word, Excel, PowerPoint, imagens e RAR
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="noExpiration" 
            checked={noExpiration} 
            onCheckedChange={(checked) => setNoExpiration(checked === true)}
          />
          <label htmlFor="noExpiration" className="text-sm font-medium">
            Documento não expira
          </label>
        </div>
        {!noExpiration && (
          <div>
            <label htmlFor="expirationDate" className="block text-sm font-medium mb-1">
              Data de Expiração
            </label>
            <Input 
              id="expirationDate" 
              type="date" 
              className="bg-gray-700"
              value={expirationDate ? format(expirationDate, 'yyyy-MM-dd') : ''}
              onChange={e => setExpirationDate(e.target.value ? new Date(e.target.value) : null)}
            />
          </div>
        )}
        <Button type="submit" className="w-full bg-gold hover:bg-gold-light text-navy" disabled={isUploading}>
          {isUploading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-navy" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Enviando...
            </span>
          ) : (
            "Enviar Documento"
          )}
        </Button>
      </form>
    </div>
  );
};
