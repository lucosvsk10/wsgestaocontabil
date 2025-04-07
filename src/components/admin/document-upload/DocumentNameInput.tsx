
import React from "react";
import { Input } from "@/components/ui/input";

interface DocumentNameInputProps {
  documentName: string;
  setDocumentName: (value: string) => void;
}

export const DocumentNameInput = ({ documentName, setDocumentName }: DocumentNameInputProps) => {
  return (
    <div className="space-y-2">
      <label htmlFor="documentName" className="text-sm font-medium">
        Nome do Documento
      </label>
      <Input
        id="documentName"
        placeholder="Nome do documento"
        value={documentName}
        onChange={(e) => setDocumentName(e.target.value)}
        required
      />
    </div>
  );
};
