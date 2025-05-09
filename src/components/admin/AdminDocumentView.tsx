
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DocumentManager } from "@/components/admin/DocumentManager";

interface AdminDocumentViewProps {
  selectedUserId: string | null;
  documentName: string;
  setDocumentName: (value: string) => void;
  documentCategory: string;
  setDocumentCategory: (value: string) => void;
  documentObservations: string;
  setDocumentObservations: (value: string) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpload: (e: React.FormEvent) => Promise<void>;
  isUploading: boolean;
  documents: any[];
  isLoadingDocuments: boolean;
  handleDeleteDocument: (id: string) => Promise<void>;
  documentCategories: string[];
  expirationDate: Date | null;
  setExpirationDate: (date: Date | null) => void;
  noExpiration: boolean;
  setNoExpiration: (value: boolean) => void;
  handleBackToUserList: () => void;
  userName: string;
}

export const AdminDocumentView = ({
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
  setNoExpiration,
  handleBackToUserList,
  userName
}: AdminDocumentViewProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleBackToUserList} 
          className="flex items-center gap-1 bg-white dark:bg-navy-light/80 text-navy dark:text-gold hover:bg-gold hover:text-navy dark:hover:bg-gold dark:hover:text-navy border border-gold/20 shadow-sm"
        >
          <ArrowLeft size={16} />
          Voltar para lista de usuários
        </Button>
        <h2 className="text-xl font-medium text-navy dark:text-gold">
          Documentos de {userName}
        </h2>
      </div>
      
      <DocumentManager 
        selectedUserId={selectedUserId} 
        documentName={documentName} 
        setDocumentName={setDocumentName} 
        documentCategory={documentCategory} 
        setDocumentCategory={setDocumentCategory} 
        documentObservations={documentObservations} 
        setDocumentObservations={setDocumentObservations} 
        handleFileChange={handleFileChange} 
        handleUpload={handleUpload} 
        isUploading={isUploading} 
        documents={documents} 
        isLoadingDocuments={isLoadingDocuments} 
        handleDeleteDocument={handleDeleteDocument} 
        documentCategories={documentCategories} 
        expirationDate={expirationDate} 
        setExpirationDate={setExpirationDate} 
        noExpiration={noExpiration} 
        setNoExpiration={setNoExpiration} 
      />
    </div>
  );
};
