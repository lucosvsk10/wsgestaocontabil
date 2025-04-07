
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DocumentCategorySelectProps {
  documentCategory: string;
  setDocumentCategory: (value: string) => void;
  documentCategories: string[];
}

export const DocumentCategorySelect = ({ 
  documentCategory, 
  setDocumentCategory, 
  documentCategories 
}: DocumentCategorySelectProps) => {
  return (
    <div className="space-y-2">
      <label htmlFor="documentCategory" className="text-sm font-medium text-[#e9aa91]">
        Categoria
      </label>
      <Select value={documentCategory} onValueChange={setDocumentCategory}>
        <SelectTrigger className="bg-[#393532] border-gold/20 text-white focus:ring-gold/30">
          <SelectValue placeholder="Selecione uma categoria" />
        </SelectTrigger>
        <SelectContent className="bg-[#393532] border-gold/20 text-white">
          {documentCategories.map((category) => (
            <SelectItem key={category} value={category} className="focus:bg-gold/20 focus:text-white">
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
