
import React from "react";
import { Upload, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface DocumentUploadAreaProps {
  selectedFiles: FileList | null;
  isUploading: boolean;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDropAreaClick: () => void;
}

export const DocumentUploadArea: React.FC<DocumentUploadAreaProps> = ({
  selectedFiles,
  isUploading,
  onDrop,
  onFileChange,
  onDropAreaClick
}) => {
  const filesArray = selectedFiles ? Array.from(selectedFiles) : [];

  const preventDefaults = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div 
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        ${isUploading 
          ? 'border-[#efc349]/50 bg-[#efc349]/5 dark:bg-gold/10' 
          : 'border-gray-300 dark:border-navy-lighter/50 hover:border-[#efc349] hover:bg-[#efc349]/5 dark:hover:bg-gold/10'}
      `} 
      onDrop={onDrop} 
      onDragOver={preventDefaults} 
      onDragEnter={preventDefaults} 
      onDragLeave={preventDefaults} 
      onClick={onDropAreaClick}
    >
      {isUploading ? (
        <div className="flex flex-col items-center">
          <LoadingSpinner />
          <p className="mt-2 text-[#020817] dark:text-white">Enviando documento(s)...</p>
        </div>
      ) : selectedFiles && selectedFiles.length > 0 ? (
        <div>
          <div className="mb-4 flex items-center justify-center">
            <Check className="h-10 w-10 text-green-500 dark:text-green-400" />
          </div>
          <h3 className="font-medium text-lg text-[#020817] dark:text-white mb-1">
            {selectedFiles.length} {selectedFiles.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}
          </h3>
          <ul className="max-h-32 overflow-auto text-sm text-[#6b7280] dark:text-gray-300 mt-2">
            {filesArray.map((file, index) => (
              <li key={index} className="truncate">{file.name}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[#6b7280] dark:text-gray-400">
            Clique para selecionar outros arquivos
          </p>
        </div>
      ) : (
        <>
          <Upload className="h-10 w-10 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
          <h3 className="font-medium text-lg text-[#020817] dark:text-white">
            Arraste e solte arquivos aqui
          </h3>
          <p className="text-[#6b7280] dark:text-gray-400 mt-1">
            ou clique para selecionar
          </p>
          <p className="text-xs text-[#6b7280] dark:text-gray-400 mt-4">
            Suporta múltiplos arquivos
          </p>
        </>
      )}
      <Input 
        id="fileInput" 
        type="file" 
        multiple 
        className="hidden" 
        onChange={onFileChange} 
        disabled={isUploading} 
      />
    </div>
  );
};
