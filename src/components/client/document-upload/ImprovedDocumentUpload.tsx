
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DocumentUploadProps } from '@/types/upload';
import { useFileUpload } from '@/hooks/upload/useFileUpload';
import { FileDropzone } from './FileDropzone';
import { GlobalSettings } from './GlobalSettings';
import { FileItem } from './FileItem';

export const ImprovedDocumentUpload: React.FC<DocumentUploadProps> = ({
  userId,
  userName,
  documentCategories,
  multipleFiles = false
}) => {
  const [globalCategory, setGlobalCategory] = useState(documentCategories[0] || 'Documentações');
  const [globalObservations, setGlobalObservations] = useState('');
  const [noExpiration, setNoExpiration] = useState(false);
  const [globalExpirationDate, setGlobalExpirationDate] = useState<Date | null>(null);
  const [useGlobalSettings, setUseGlobalSettings] = useState(true);
  
  const {
    files,
    isUploading,
    onDrop: baseOnDrop,
    removeFile,
    updateFileField,
    updateFileExpirationDate,
    applyGlobalSettingsToAll: baseApplyGlobalSettingsToAll,
    handleUpload,
  } = useFileUpload(userId, userName);

  // Wrapper functions to include global state
  const onDropWrapper = (acceptedFiles: File[]) => {
    baseOnDrop(acceptedFiles, globalCategory, globalObservations, noExpiration, globalExpirationDate);
  };

  const applyGlobalSettingsToAll = () => {
    baseApplyGlobalSettingsToAll(globalCategory, globalObservations, noExpiration, globalExpirationDate);
  };
  
  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 dark:border-gold/20 bg-white dark:bg-navy-dark shadow-md">
        <CardHeader className="border-b border-gray-200 dark:border-gold/20 bg-gray-50 dark:bg-navy-deeper">
          <CardTitle className="text-navy dark:text-gold text-xl font-museo flex items-center">
            <Upload className="h-5 w-5 mr-2 text-navy dark:text-gold" />
            Enviando documentos para {userName}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* Global settings for all files */}
          {multipleFiles && (
            <GlobalSettings 
              globalCategory={globalCategory}
              setGlobalCategory={setGlobalCategory}
              globalObservations={globalObservations}
              setGlobalObservations={setGlobalObservations}
              globalExpirationDate={globalExpirationDate}
              setGlobalExpirationDate={setGlobalExpirationDate}
              noExpiration={noExpiration}
              setNoExpiration={setNoExpiration}
              useGlobalSettings={useGlobalSettings}
              setUseGlobalSettings={setUseGlobalSettings}
              applyGlobalSettingsToAll={applyGlobalSettingsToAll}
              documentCategories={documentCategories}
              filesCount={files.length}
            />
          )}
          
          {/* Drop area */}
          <FileDropzone 
            onDrop={onDropWrapper} 
            multipleFiles={multipleFiles} 
          />
          
          {/* File list */}
          {files.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="font-medium text-navy dark:text-gold">Arquivos selecionados ({files.length})</h3>
              
              <div className="space-y-4">
                {files.map((file) => (
                  <FileItem
                    key={file.id}
                    file={file}
                    updateFileField={updateFileField}
                    updateFileExpirationDate={updateFileExpirationDate}
                    removeFile={removeFile}
                    documentCategories={documentCategories}
                    useGlobalSettings={useGlobalSettings}
                  />
                ))}
              </div>
            </div>
          )}
          
          {files.length > 0 && (
            <Button 
              type="button" 
              onClick={handleUpload} 
              className="w-full mt-6 bg-navy hover:bg-navy/90 dark:bg-gold dark:hover:bg-gold/90 text-white dark:text-navy font-medium"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {files.length > 1 ? `Enviar ${files.length} documentos` : 'Enviar documento'}
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
