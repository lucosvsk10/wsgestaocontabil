
import { DocumentUpload } from "./DocumentUpload";
import { DocumentList } from "./DocumentList";
import { AlertCircle, HelpCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

interface DocumentManagerProps {
  selectedUserId: string | null;
  documentName: string;
  setDocumentName: (name: string) => void;
  documentCategory: string;
  setDocumentCategory: (category: string) => void;
  documentObservations: string;
  setDocumentObservations: (observations: string) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpload: (e: React.FormEvent) => Promise<void>;
  isUploading: boolean;
  documents: any[];
  isLoadingDocuments: boolean;
  handleDeleteDocument: (documentId: string) => Promise<void>;
  documentCategories: string[];
  expirationDate: Date | null;
  setExpirationDate: (date: Date | null) => void;
  noExpiration: boolean;
  setNoExpiration: (noExpiration: boolean) => void;
}

export const DocumentManager = ({
  selectedUserId,
  documentName,
  setDocumentName,
  documentCategory,
  setDocumentCategory,
  documentObservations,
  setDocumentObservations,
  handleFileChange,
  handleUpload,
  isUploading,
  documents,
  isLoadingDocuments,
  handleDeleteDocument,
  documentCategories,
  expirationDate,
  setExpirationDate,
  noExpiration,
  setNoExpiration
}: DocumentManagerProps) => {
  const [activeTab, setActiveTab] = useState("upload");

  if (!selectedUserId) {
    return (
      <div className="p-8 space-y-6">
        <Alert className="border-none bg-gray-50 dark:bg-transparent text-[#020817] dark:text-white">
          <AlertCircle className="h-4 w-4 text-orange-500 dark:text-[#efc349]" />
          <AlertTitle className="text-[#020817] dark:text-[#efc349] font-medium">Nenhum usuário selecionado</AlertTitle>
          <AlertDescription className="text-gray-700 dark:text-white/70">
            Selecione um usuário na lista para gerenciar seus documentos.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Tabs defaultValue="upload" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 bg-gray-50 dark:bg-transparent rounded-xl p-1">
          <TabsTrigger 
            value="upload" 
            className="text-[#020817] data-[state=active]:bg-white data-[state=active]:text-[#020817] data-[state=active]:shadow-sm dark:text-white/80 dark:data-[state=active]:bg-[#efc349]/10 dark:data-[state=active]:text-[#efc349] transition-all duration-300 rounded-lg"
          >
            Enviar documento
          </TabsTrigger>
          <TabsTrigger 
            value="manage" 
            className="text-[#020817] data-[state=active]:bg-white data-[state=active]:text-[#020817] data-[state=active]:shadow-sm dark:text-white/80 dark:data-[state=active]:bg-[#efc349]/10 dark:data-[state=active]:text-[#efc349] transition-all duration-300 rounded-lg"
          >
            Gerenciar documentos
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="p-8 space-y-8">
          <Alert variant="default" className="border-none bg-gray-50 dark:bg-transparent text-[#020817] dark:text-white">
            <HelpCircle className="h-4 w-4 text-orange-500 dark:text-[#efc349]" />
            <AlertTitle className="text-[#020817] dark:text-[#efc349] font-medium">Dica</AlertTitle>
            <AlertDescription className="text-gray-700 dark:text-white/70">
              Para documentos na categoria "Impostos", você pode especificar se é Imposto de Renda ou outros tipos de impostos.
            </AlertDescription>
          </Alert>
          
          <DocumentUpload 
            onUpload={handleUpload} 
            isUploading={isUploading} 
            documentName={documentName} 
            setDocumentName={setDocumentName} 
            documentCategory={documentCategory} 
            setDocumentCategory={setDocumentCategory} 
            documentObservations={documentObservations} 
            setDocumentObservations={setDocumentObservations} 
            documentCategories={documentCategories} 
            handleFileChange={handleFileChange} 
            expirationDate={expirationDate} 
            setExpirationDate={setExpirationDate} 
            noExpiration={noExpiration} 
            setNoExpiration={setNoExpiration} 
          />
        </TabsContent>
        
        <TabsContent value="manage" className="space-y-8">
          <DocumentList 
            documents={documents} 
            isLoading={isLoadingDocuments} 
            handleDeleteDocument={handleDeleteDocument} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
