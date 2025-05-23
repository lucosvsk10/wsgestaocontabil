
import { Card, CardContent } from "@/components/ui/card";
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
      <Card className="bg-white dark:bg-transparent border border-gray-200 dark:border-gold/30 shadow-lg">
        <CardContent className="pt-6">
          <Alert className="border-gray-300 dark:border-gold/20 bg-orange-50 dark:bg-transparent text-navy dark:text-[#d9d9d9]">
            <AlertCircle className="h-4 w-4 text-orange-500 dark:text-gold" />
            <AlertTitle className="text-gray-800 dark:text-gold font-medium">Nenhum usuário selecionado</AlertTitle>
            <AlertDescription className="text-gray-700 dark:text-[#d9d9d9]">
              Selecione um usuário na lista para gerenciar seus documentos.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="upload" value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-4 border border-gray-300 dark:border-gold/20 bg-gray-50 dark:bg-transparent shadow-sm overflow-hidden">
        <TabsTrigger 
          value="upload" 
          className="text-gray-700 dark:text-[#d9d9d9] data-[state=active]:bg-navy data-[state=active]:text-white dark:data-[state=active]:bg-gold dark:data-[state=active]:text-deepNavy transition-colors"
        >
          Enviar documento
        </TabsTrigger>
        <TabsTrigger 
          value="manage" 
          className="text-gray-700 dark:text-[#d9d9d9] data-[state=active]:bg-navy data-[state=active]:text-white dark:data-[state=active]:bg-gold dark:data-[state=active]:text-deepNavy transition-colors"
        >
          Gerenciar documentos
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="upload" className="bg-white dark:bg-transparent border border-gray-200 dark:border-gold/30 rounded-lg shadow-lg p-6">
        <div className="grid grid-cols-1 gap-6">
          <Alert variant="default" className="border-orange-200 dark:border-gold/20 bg-orange-50 dark:bg-transparent text-navy dark:text-[#d9d9d9]">
            <HelpCircle className="h-4 w-4 text-orange-500 dark:text-gold" />
            <AlertTitle className="text-gray-800 dark:text-gold font-medium">Dica</AlertTitle>
            <AlertDescription className="text-gray-700 dark:text-[#d9d9d9]">
              Para documentos na categoria "Impostos", você pode especificar se é Imposto de Renda ou outros tipos de impostos.
            </AlertDescription>
          </Alert>
          
          <div className="w-full">
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
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="manage" className="bg-white dark:bg-transparent border border-gray-200 dark:border-gold/30 rounded-lg shadow-lg">
        <DocumentList 
          documents={documents} 
          isLoading={isLoadingDocuments} 
          handleDeleteDocument={handleDeleteDocument} 
        />
      </TabsContent>
    </Tabs>
  );
};
