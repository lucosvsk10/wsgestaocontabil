
import React, { useState } from "react";
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
  const [showSubcategory, setShowSubcategory] = useState(false);

  const handleCategoryChange = (value: string) => {
    setDocumentCategory(value);
    setShowSubcategory(value === "Impostos");
  };

  return (
    <div className="space-y-2">
      <label htmlFor="documentCategory" className="text-sm font-medium text-[#e9aa91]">
        Categoria
      </label>
      <Select value={documentCategory} onValueChange={handleCategoryChange}>
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

      {showSubcategory && (
        <div className="mt-4">
          <label htmlFor="documentSubcategory" className="text-sm font-medium text-[#e9aa91]">
            Tipo de Imposto
          </label>
          <Select 
            defaultValue="other"
            onValueChange={(value) => setDocumentCategory(`Impostos/${value}`)}
          >
            <SelectTrigger className="bg-[#393532] border-gold/20 text-white focus:ring-gold/30">
              <SelectValue placeholder="Selecione o tipo de imposto" />
            </SelectTrigger>
            <SelectContent className="bg-[#393532] border-gold/20 text-white">
              <SelectItem value="Imposto de Renda" className="focus:bg-gold/20 focus:text-white">
                Imposto de Renda
              </SelectItem>
              <SelectItem value="other" className="focus:bg-gold/20 focus:text-white">
                Outros Impostos
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
