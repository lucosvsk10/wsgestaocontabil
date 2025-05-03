
import React, { useEffect, useState } from "react";
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
  // Determine if we're showing subcategory based on the current category value
  const [showSubcategory, setShowSubcategory] = useState(documentCategory === "Impostos" || documentCategory.startsWith("Impostos/"));
  
  // Manter a subcategoria persistente quando já selecionada
  useEffect(() => {
    if (documentCategory === "Impostos" || documentCategory.startsWith("Impostos/")) {
      setShowSubcategory(true);
    }
  }, [documentCategory]);

  // Extrair a subcategoria se existir
  const getSelectedSubcategory = () => {
    if (documentCategory.startsWith("Impostos/")) {
      return documentCategory.split("/")[1];
    }
    return "other";
  };

  const handleCategoryChange = (value: string) => {
    if (value !== "Impostos") {
      // Se não for Impostos, apenas atualiza a categoria
      setDocumentCategory(value);
      setShowSubcategory(false);
    } else {
      // Se for Impostos, mostra a subcategoria e atualiza a categoria
      setDocumentCategory(value);
      setShowSubcategory(true);
    }
  };

  const handleSubcategoryChange = (value: string) => {
    if (value === "other") {
      setDocumentCategory("Impostos");
    } else {
      setDocumentCategory(`Impostos/${value}`);
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor="documentCategory" className="text-sm font-medium text-[#e9aa91]">
        Categoria
      </label>
      <Select value={documentCategory.startsWith("Impostos/") ? "Impostos" : documentCategory} onValueChange={handleCategoryChange}>
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
            value={getSelectedSubcategory()}
            onValueChange={handleSubcategoryChange}
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
