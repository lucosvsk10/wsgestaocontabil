
import React from "react";

interface DocumentCategorySelectProps {
  documentCategory: string;
  setDocumentCategory: (category: string) => void;
  documentCategories: string[];
}

export const DocumentCategorySelect = ({
  documentCategory,
  setDocumentCategory,
  documentCategories,
}: DocumentCategorySelectProps) => {
  return (
    <div>
      <label
        htmlFor="document-category"
        className="block text-sm font-medium text-gray-700 dark:text-gray-200"
      >
        Categoria
      </label>
      <select
        id="document-category"
        value={documentCategory}
        onChange={(e) => setDocumentCategory(e.target.value)}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-navy-lighter/40 focus:outline-none focus:ring-navy dark:focus:ring-gold/50 focus:border-navy dark:focus:border-gold/50 sm:text-sm rounded-md dark:bg-navy-deeper dark:text-white"
        required
      >
        <option value="">Selecione uma categoria</option>
        {documentCategories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </div>
  );
};
