
import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, File, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/utils/formatters";

interface FileDropzoneProps {
  onFilesChange: (files: File[]) => void;
  selectedFiles: File[];
  maxSize?: number; // in bytes
  maxFiles?: number;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFilesChange,
  selectedFiles,
  maxSize = 10485760, // Default 10MB
  maxFiles = 10,
}) => {
  const [fileRejections, setFileRejections] = useState<any[]>([]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (selectedFiles.length + acceptedFiles.length > maxFiles) {
      setFileRejections([
        ...fileRejections,
        { message: `Você pode enviar no máximo ${maxFiles} arquivos.` },
      ]);
      return;
    }

    if (rejectedFiles.length > 0) {
      setFileRejections(rejectedFiles);
    } else {
      setFileRejections([]);
    }

    const newFiles = [...selectedFiles, ...acceptedFiles];
    onFilesChange(newFiles);
  }, [selectedFiles, onFilesChange, maxFiles, fileRejections, maxSize]);
  
  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    onFilesChange(newFiles);
  };

  const removeAllFiles = () => {
    onFilesChange([]);
    setFileRejections([]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors 
        ${
          isDragActive
            ? "border-gold bg-gold/10 dark:border-gold dark:bg-gold/5"
            : "border-gray-300 dark:border-gray-600 hover:border-gold hover:bg-gold/5"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2">
          <Upload size={38} className="text-navy dark:text-gold" />
          <p className="text-lg font-medium text-navy dark:text-white">
            {isDragActive ? (
              "Solte os arquivos aqui"
            ) : (
              "Arraste e solte os arquivos aqui, ou clique para selecionar"
            )}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tamanho máximo: {formatBytes(maxSize)} | Máximo {maxFiles} arquivos
          </p>
        </div>
      </div>

      {fileRejections.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-medium mb-1">
            <FileX size={16} />
            Erros no upload
          </div>
          <ul className="text-sm text-red-700 dark:text-red-400 list-disc pl-5">
            {fileRejections.map((rejection, index) => (
              <li key={index}>
                {rejection.file?.name}: {rejection.errors?.[0]?.message || rejection.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-navy dark:text-white">
              {selectedFiles.length} {selectedFiles.length === 1 ? "arquivo selecionado" : "arquivos selecionados"}
            </h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={removeAllFiles}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <X size={16} className="mr-1" />
              Limpar tudo
            </Button>
          </div>
          
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between bg-gray-50 dark:bg-navy-light/10 p-3 rounded-md border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <File size={20} className="text-navy dark:text-gold shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-navy dark:text-white truncate">{file.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeFile(index)} 
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <X size={16} />
                  <span className="sr-only">Remover</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
