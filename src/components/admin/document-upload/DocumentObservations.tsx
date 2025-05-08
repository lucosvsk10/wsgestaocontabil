
import React from "react";
import { Textarea } from "@/components/ui/textarea";
interface DocumentObservationsProps {
  documentObservations: string;
  setDocumentObservations: (value: string) => void;
}
export const DocumentObservations = ({
  documentObservations,
  setDocumentObservations
}: DocumentObservationsProps) => {
  return <div className="space-y-2">
      <label htmlFor="observations" className="text-sm font-medium text-gray-700 dark:text-[#e9aa91]">
        Observações
      </label>
      <Textarea 
        id="observations" 
        placeholder="Observações sobre o documento (opcional)" 
        value={documentObservations} 
        onChange={e => setDocumentObservations(e.target.value)} 
        rows={3} 
        className="border-gray-300 dark:border-gold/20 text-gray-800 dark:text-white focus-visible:ring-navy/30 dark:focus-visible:ring-gold/30 bg-white dark:bg-navy-dark shadow-sm" 
      />
      <p className="text-xs text-gray-500 dark:text-[#e9aa91]/70">
        Adicione instruções ou informações relevantes sobre o documento
      </p>
    </div>;
};
