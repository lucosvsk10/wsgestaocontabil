
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentNameInput } from "./document-upload/DocumentNameInput";
import { DocumentCategorySelect } from "./document-upload/DocumentCategorySelect";
import { DocumentObservations } from "./document-upload/DocumentObservations";
import { DocumentExpirationFields } from "./document-upload/DocumentExpirationFields";
import { FileUploadArea } from "./document-upload/FileUploadArea";

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
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpload(e);
  };

  return (
    <Card className="w-full bg-[#46413d]">
      <CardHeader>
        <CardTitle>Enviar Documento</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DocumentNameInput 
                documentName={documentName}
                setDocumentName={setDocumentName}
              />
              
              <DocumentCategorySelect
                documentCategory={documentCategory}
                setDocumentCategory={setDocumentCategory}
                documentCategories={documentCategories}
              />
            </div>
            
            <DocumentObservations
              documentObservations={documentObservations}
              setDocumentObservations={setDocumentObservations}
            />

            <DocumentExpirationFields
              noExpiration={noExpiration}
              setNoExpiration={setNoExpiration}
              expirationDate={expirationDate}
              setExpirationDate={setExpirationDate}
            />

            <FileUploadArea handleFileChange={handleFileChange} />
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
