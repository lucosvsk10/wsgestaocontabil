
import { Textarea } from "@/components/ui/textarea";
import React from "react";

interface DocumentObservationsProps {
  documentObservations: string;
  setDocumentObservations: (observations: string) => void;
}

export const DocumentObservations = ({
  documentObservations,
  setDocumentObservations,
}: DocumentObservationsProps) => {
  return (
    <div>
      <label
        htmlFor="document-observations"
        className="block text-sm font-medium text-gray-700 dark:text-gold/90"
      >
        Observações (opcional)
      </label>
      <Textarea
        id="document-observations"
        value={documentObservations}
        onChange={(e) => setDocumentObservations(e.target.value)}
        className="mt-1 block w-full border-gray-300 dark:border-navy-lighter/40 focus:ring-navy dark:focus:ring-gold/70 focus:border-navy dark:focus:border-gold/70 sm:text-sm rounded-md dark:bg-navy-deeper dark:text-white dark:placeholder-gray-300"
        rows={3}
        placeholder="Adicione observações relevantes sobre o documento, como notas ou comentários específicos"
      />
    </div>
  );
};
