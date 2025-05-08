
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DocumentNameInputProps {
  documentName: string;
  setDocumentName: (value: string) => void;
}

export const DocumentNameInput = ({
  documentName,
  setDocumentName
}: DocumentNameInputProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="documentName" className="text-sm font-medium text-gray-700 dark:text-[#e9aa91]">
        Nome do Documento
      </Label>
      <Input 
        id="documentName" 
        placeholder="Nome do documento" 
        value={documentName} 
        onChange={e => setDocumentName(e.target.value)} 
        required 
        className="border-gray-300 dark:border-gold/20 text-gray-800 dark:text-white focus-visible:ring-navy/30 dark:focus-visible:ring-gold/30 bg-white dark:bg-navy-dark shadow-sm" 
      />
    </div>
  );
};
