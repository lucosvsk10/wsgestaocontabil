
import React, { useState } from "react";
import { Upload } from "lucide-react";
interface FileUploadAreaProps {
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
export const FileUploadArea = ({
  handleFileChange
}: FileUploadAreaProps) => {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFileName(e.target.files[0].name);
      handleFileChange(e);
    }
  };
  return <div className="space-y-2">
      <label htmlFor="fileInput" className="text-sm font-medium text-gray-700 dark:text-[#e9aa91]">
        Arquivo
      </label>
      <div className="flex items-center justify-center w-full">
        <label htmlFor="fileInput" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gold/20 rounded-lg cursor-pointer transition-colors bg-gray-50 hover:bg-gray-100 dark:bg-navy-dark dark:hover:bg-navy-light/10">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-2 text-gray-400 dark:text-gold/60" />
            <p className="mb-2 text-sm text-gray-600 dark:text-[#e9aa91]">
              <span className="font-semibold">Clique para enviar</span> ou arraste e solte
            </p>
            {selectedFileName ? <p className="text-xs text-gray-700 dark:text-white bg-gray-200/80 dark:bg-[#46413d]/80 px-2 py-1 rounded">
                {selectedFileName}
              </p> : <p className="text-xs text-gray-500 dark:text-[#e9aa91]/60">PDF, DOCX, JPG, PNG (max. 10MB)</p>}
          </div>
          <input id="fileInput" type="file" className="hidden" onChange={handleFileSelect} required />
        </label>
      </div>
    </div>;
};
