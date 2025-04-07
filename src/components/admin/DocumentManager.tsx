
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentUpload } from "./DocumentUpload";
import { DocumentList } from "./DocumentList";
import { Document } from "@/utils/auth/types";
import { AlertCircle, HelpCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  documents: Document[];
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
  if (!selectedUserId) {
    return (
      <Card className="bg-[#46413d]">
        <CardContent className="pt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Nenhum usuário selecionado</AlertTitle>
            <AlertDescription>
              Selecione um usuário na lista para gerenciar seus documentos.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="upload" className="bg-[#46413d]">
      <TabsList className="mb-4">
        <TabsTrigger value="upload">Enviar documento</TabsTrigger>
        <TabsTrigger value="manage">Gerenciar documentos</TabsTrigger>
      </TabsList>
      <TabsContent value="upload" className="bg-[#46413d]">
        <div className="grid grid-cols-1 gap-6">
          <Alert variant="default">
            <HelpCircle className="h-4 w-4" />
            <AlertTitle>Dica</AlertTitle>
            <AlertDescription>
              Adicione observações importantes para o cliente ao enviar um documento, 
              como prazos, instruções ou qualquer informação relevante.
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
        </div>
      </TabsContent>
      <TabsContent value="manage" className="bg-[#46413d]">
        <DocumentList
          documents={documents}
          isLoading={isLoadingDocuments}
          handleDeleteDocument={handleDeleteDocument}
        />
      </TabsContent>
    </Tabs>
  );
};
