
import React, { useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, File, FileText, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/utils/formatters';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';

interface FileDropzoneProps {
  selectedFiles: File[];
  onFilesChange: (files: File[]) => void;
  maxSize?: number;
  maxFiles?: number;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  selectedFiles,
  onFilesChange,
  maxSize = 10485760, // 10MB default
  maxFiles = 5
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Limit to maxFiles
    const newFiles = [...selectedFiles];
    acceptedFiles.forEach(file => {
      // Check if file already exists
      if (!newFiles.some(f => f.name === file.name && f.size === file.size)) {
        newFiles.push(file);
      }
    });
    
    // Enforce max files limit
    if (newFiles.length > maxFiles) {
      newFiles.splice(maxFiles);
    }
    
    onFilesChange(newFiles);
  }, [selectedFiles, onFilesChange, maxFiles]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize,
    multiple: true,
    accept: {
      'application/pdf': ['.pdf']
    }
  });
  
  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    onFilesChange(newFiles);
  };
  
  const getFileIcon = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return <FileImage className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    }
    
    if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(extension || '')) {
      return <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />;
    }
    
    return <File className="h-5 w-5 text-navy dark:text-gold" />;
  };
  
  const fileList = useMemo(() => (
    <div className="mt-4 space-y-2">
      {selectedFiles.map((file, index) => (
        <div 
          key={`${file.name}-${index}`} 
          className="flex items-center justify-between p-2 border border-gray-200 dark:border-navy-lighter/30 rounded-md bg-white dark:bg-navy-medium"
        >
          <div className="flex items-center overflow-hidden">
            {getFileIcon(file)}
            <div className="ml-2 overflow-hidden">
              <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-200">{file.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{formatBytes(file.size)}</p>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => removeFile(index)}
                className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remover arquivo</TooltipContent>
          </Tooltip>
        </div>
      ))}
    </div>
  ), [selectedFiles]);
  
  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-gold bg-gold/10 dark:bg-navy-light/20' 
            : 'border-gray-300 dark:border-navy-lighter/40 dark:hover:border-gold/40 bg-gray-50 dark:bg-navy-deeper hover:bg-gray-100 dark:hover:bg-navy-medium'}`
        }
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center">
          <UploadCloud className="h-12 w-12 text-gray-400 dark:text-gold/70 mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
            {isDragActive
              ? 'Solte os arquivos aqui'
              : 'Arraste e solte arquivos aqui, ou clique para selecionar'
            }
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Apenas arquivos PDF (máx. {formatBytes(maxSize)})
          </p>
          {selectedFiles.length > 0 && (
            <p className="text-xs text-navy-dark dark:text-gold mt-2">
              {selectedFiles.length} {selectedFiles.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}
              {maxFiles && ` (máximo de ${maxFiles})`}
            </p>
          )}
        </div>
      </div>
      
      {selectedFiles.length > 0 && fileList}
    </div>
  );
};
