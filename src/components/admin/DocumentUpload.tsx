
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Upload } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres" }),
  category: z.string().min(1, { message: "Categoria é obrigatória" }),
  observations: z.string().optional(),
  noExpiration: z.boolean().default(false),
  expirationDate: z.date().nullable().optional(),
  file: z.any().refine(file => file?.length === 1, { message: "Arquivo é obrigatório" }),
});

interface DocumentUploadProps {
  onUpload: (e: React.FormEvent) => Promise<void>;
  isUploading: boolean;
  documentName: string;
  setDocumentName: (value: string) => void;
  documentCategory: string;
  setDocumentCategory: (value: string) => void;
  documentObservations: string;
  setDocumentObservations: (value: string) => void;
  documentCategories: string[];
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  expirationDate: Date | null;
  setExpirationDate: (date: Date | null) => void;
  noExpiration: boolean;
  setNoExpiration: (value: boolean) => void;
}

export const DocumentUpload = ({
  onUpload,
  isUploading,
  documentName,
  setDocumentName,
  documentCategory,
  setDocumentCategory,
  documentObservations,
  setDocumentObservations,
  documentCategories,
  handleFileChange,
  expirationDate,
  setExpirationDate,
  noExpiration,
  setNoExpiration,
}: DocumentUploadProps) => {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "Documentações",
      observations: "",
      noExpiration: false,
      expirationDate: null,
      file: undefined,
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFileName(e.target.files[0].name);
      form.setValue("file", e.target.files);
      handleFileChange(e);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpload(e);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Enviar Documento</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
            
            <div className="space-y-2">
              <label htmlFor="observations" className="text-sm font-medium">
                Observações
              </label>
              <Textarea
                id="observations"
                placeholder="Observações sobre o documento (opcional)"
                value={documentObservations}
                onChange={(e) => setDocumentObservations(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-gray-400">
                Adicione instruções ou informações relevantes sobre o documento
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="noExpiration" 
                    checked={noExpiration} 
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setExpirationDate(null);
                      }
                      setNoExpiration(!!checked);
                    }}
                  />
                  <label
                    htmlFor="noExpiration"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Sem data de expiração
                  </label>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Data de Expiração
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expirationDate && "text-muted-foreground"
                      )}
                      disabled={noExpiration}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expirationDate ? format(expirationDate, "PPP", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={expirationDate || undefined}
                      onSelect={setExpirationDate}
                      disabled={noExpiration}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="fileInput" className="text-sm font-medium">
                Arquivo
              </label>
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="fileInput"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-800/30 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-400">
                      <span className="font-semibold">Clique para enviar</span> ou arraste e solte
                    </p>
                    {selectedFileName ? (
                      <p className="text-xs text-gray-300 bg-gray-700/50 px-2 py-1 rounded">
                        {selectedFileName}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">PDF, DOCX, JPG, PNG (max. 10MB)</p>
                    )}
                  </div>
                  <input
                    id="fileInput"
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    required
                  />
                </label>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isUploading}>
            {isUploading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground"></div>
                Enviando...
              </>
            ) : (
              "Enviar Documento"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
