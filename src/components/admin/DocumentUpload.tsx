
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
  setNoExpiration
}: DocumentUploadProps) => {
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpload(e);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto border border-gray-200 dark:border-gold/20 bg-white dark:bg-navy-dark rounded-lg shadow-lg overflow-hidden">
      <CardHeader className="space-y-1 text-center my-0 rounded-t-md pb-3 bg-gray-50 dark:bg-navy-light/10 border-b border-gray-200 dark:border-gold/20">
        <CardTitle className="text-navy dark:text-gold font-medium text-2xl tracking-wide">ENVIAR DOCUMENTO</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="grid gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <DocumentNameInput documentName={documentName} setDocumentName={setDocumentName} />
              
              <DocumentCategorySelect documentCategory={documentCategory} setDocumentCategory={setDocumentCategory} documentCategories={documentCategories} />
            </div>
            
            <DocumentObservations documentObservations={documentObservations} setDocumentObservations={setDocumentObservations} />

            <DocumentExpirationFields noExpiration={noExpiration} setNoExpiration={setNoExpiration} expirationDate={expirationDate} setExpirationDate={setExpirationDate} />

            <FileUploadArea handleFileChange={handleFileChange} />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-navy hover:bg-navy/90 dark:bg-gold dark:hover:bg-gold-light dark:text-navy text-white font-medium shadow-md transition-colors py-2.5"
            disabled={isUploading}
          >
            {isUploading ? (
              <div className="flex items-center justify-center">
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground"></div>
                Enviando...
              </div>
            ) : (
              "Enviar Documento"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
