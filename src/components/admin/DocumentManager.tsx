
import { File } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentUpload } from "./DocumentUpload";
import { DocumentList } from "./DocumentList";
import { Document } from "@/types/admin";

interface DocumentManagerProps {
  selectedUserId: string | null;
  documentName: string;
  setDocumentName: (name: string) => void;
  documentCategory: string;
  setDocumentCategory: (category: string) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpload: (e: React.FormEvent) => void;
  isUploading: boolean;
  documents: Document[];
  isLoadingDocuments: boolean;
  handleDeleteDocument: (id: string) => void;
  documentCategories: string[];
  expirationDate: Date | null;
  setExpirationDate: (date: Date | null) => void;
  noExpiration: boolean;
  setNoExpiration: (value: boolean) => void;
}

export const DocumentManager = ({
  selectedUserId,
  documentName,
  setDocumentName,
  documentCategory,
  setDocumentCategory,
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
  return (
    <Card className="md:col-span-2 bg-[b#393532]] bg-[#393532]">
      <CardHeader className="bg-[#393532] rounded-3xl">
        <CardTitle className="text-[#e8cc81]">Gerenciamento de Documentos</CardTitle>
      </CardHeader>
      <CardContent className="bg-[#393532] rounded-3xl">
        {selectedUserId ? (
          <div className="space-y-6">
            {/* Formulário de Upload */}
            <DocumentUpload 
              documentName={documentName}
              setDocumentName={setDocumentName}
              documentCategory={documentCategory}
              setDocumentCategory={setDocumentCategory}
              handleFileChange={handleFileChange}
              handleUpload={handleUpload}
              isUploading={isUploading}
              documentCategories={documentCategories}
              expirationDate={expirationDate}
              setExpirationDate={setExpirationDate}
              noExpiration={noExpiration}
              setNoExpiration={setNoExpiration}
            />
            
            {/* Lista de Documentos */}
            <DocumentList 
              documents={documents}
              isLoadingDocuments={isLoadingDocuments}
              handleDeleteDocument={handleDeleteDocument}
            />
          </div>
        ) : (
          <div className="text-center py-8 text-[#46413d]-400 bg-[#393532]">
            <File className="h-16 w-16 mx-auto mb-4 opacity-20 bg-[inh] bg-inherit" />
            <p className="text-[#e9aa91]">Selecione um usuário para gerenciar seus documentos</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
