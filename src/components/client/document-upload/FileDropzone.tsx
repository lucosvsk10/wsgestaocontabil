
import React from 'react';
import { FileUp, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropzoneProps } from '@/types/upload';

export const FileDropzone: React.FC<DropzoneProps> = ({ onDrop, multipleFiles }) => {
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDrop(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Add visual feedback when dragging over the drop zone
    const target = e.currentTarget;
    target.classList.add('border-gold', 'dark:border-gold', 'bg-gold/5', 'dark:bg-gold/10');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Remove visual feedback when leaving the drop zone
    const target = e.currentTarget;
    target.classList.remove('border-gold', 'dark:border-gold', 'bg-gold/5', 'dark:bg-gold/10');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onDrop(Array.from(e.target.files));
    }
  };

  return (
    <div 
      className="border-2 border-dashed border-gray-300 dark:border-gold/30 rounded-lg p-8 text-center hover:border-navy dark:hover:border-gold/50 transition-colors"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <FileUp className="mx-auto h-12 w-12 text-gray-400 dark:text-gold/70" />
      
      <div className="mt-4">
        <h3 className="text-lg font-medium text-navy-dark dark:text-gold">
          {multipleFiles ? 'Arraste vários arquivos ou clique para fazer upload' : 'Arraste um arquivo ou clique para fazer upload'}
        </h3>
        
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Formatos suportados: PDF, DOCX, JPG, PNG, XLS, XLSX
        </p>
        
        <div className="mt-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => document.getElementById('fileInput')?.click()}
            className="bg-white dark:bg-navy-light/30 border-navy/20 dark:border-gold/20 text-navy dark:text-gold hover:bg-navy hover:text-white dark:hover:bg-gold dark:hover:text-navy transition-colors shadow-sm"
          >
            <Upload className="mr-2 h-4 w-4" />
            Selecionar arquivo{multipleFiles ? 's' : ''}
          </Button>
          <input
            id="fileInput"
            type="file"
            className="hidden"
            onChange={handleFileChange}
            multiple={multipleFiles}
            accept=".pdf,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
          />
        </div>
      </div>
    </div>
  );
};
