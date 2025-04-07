
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
      <label htmlFor="documentCategory" className="text-sm font-medium">
        Categoria
      </label>
      <Select value={documentCategory} onValueChange={setDocumentCategory}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione uma categoria" />
        </SelectTrigger>
        <SelectContent>
          {documentCategories.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
