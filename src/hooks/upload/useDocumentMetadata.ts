
import { useState } from "react";

export const useDocumentMetadata = () => {
  const [documentCategory, setDocumentCategory] = useState("Documentações");
  const [documentObservations, setDocumentObservations] = useState("");
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [noExpiration, setNoExpiration] = useState(false);

  return {
    documentCategory,
    setDocumentCategory,
    documentObservations,
    setDocumentObservations,
    expirationDate,
    setExpirationDate,
    noExpiration,
    setNoExpiration
  };
};
