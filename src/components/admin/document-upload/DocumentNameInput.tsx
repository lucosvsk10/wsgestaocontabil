
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DocumentNameInputProps {
  documentName: string;
  setDocumentName: (name: string) => void;
}

export const DocumentNameInput = ({ documentName, setDocumentName }: DocumentNameInputProps) => {
  return (
    <div>
      <Label htmlFor="document-name" className="text-gray-700 dark:text-gold/90">
        Nome do Documento
      </Label>
      <Input
        id="document-name"
        value={documentName}
        onChange={(e) => setDocumentName(e.target.value)}
        className="mt-1 border-gray-300 dark:border-gold/30 focus:ring-navy dark:focus:ring-gold/70 focus:border-navy dark:focus:border-gold/70 dark:bg-navy-dark/80 dark:text-white dark:placeholder-gray-300"
        placeholder="Declaração de IR 2023"
        required
      />
    </div>
  );
};
