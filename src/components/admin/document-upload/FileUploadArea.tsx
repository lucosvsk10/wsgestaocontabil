
import { UploadCloud } from "lucide-react";
import React from "react";

interface FileUploadAreaProps {
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const FileUploadArea = ({ handleFileChange }: FileUploadAreaProps) => {
  return (
    <div className="mt-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
        Arquivo do Documento
      </label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 dark:border-gold/20 dark:hover:border-gold/40 rounded-lg cursor-pointer bg-gray-50 dark:bg-navy-light/20 hover:bg-gray-100 dark:hover:bg-navy-light/30 transition-all duration-200">
        <div className="space-y-1 text-center">
          <UploadCloud className="mx-auto h-12 w-12 text-gray-400 dark:text-gold/70" />
          <div className="flex text-sm text-gray-600 dark:text-gray-300">
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer rounded-md font-medium text-navy dark:text-gold hover:text-navy-light dark:hover:text-gold-light focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-navy dark:focus-within:ring-gold/50"
            >
              <span>Upload um arquivo</span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>
            <p className="pl-1">ou arraste e solte</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            PDF, DOC, DOCX, XLS, XLSX, JPG, PNG até 10MB
          </p>
        </div>
      </div>
    </div>
  );
};
