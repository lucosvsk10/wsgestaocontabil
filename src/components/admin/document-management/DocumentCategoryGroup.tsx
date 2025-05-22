
import React, { useState } from 'react';
import { Document, DocumentCategory } from '@/types/common';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, FileIcon, Download, Edit, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/lib/utils';

interface DocumentCategoryGroupProps {
  category: DocumentCategory;
  documents: Document[];
  loadingDocumentIds: Set<string>;
  onDownload: (document: Document) => Promise<void>;
  onEdit: (document: Document) => void;
  onDelete: (document: Document) => void;
}

export const DocumentCategoryGroup: React.FC<DocumentCategoryGroupProps> = ({
  category,
  documents,
  loadingDocumentIds,
  onDownload,
  onEdit,
  onDelete
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch (e) {
      return "Data inválida";
    }
  };

  const isExpired = (expirationDate: string | null) => {
    if (!expirationDate) return false;
    try {
      return new Date(expirationDate) < new Date();
    } catch (e) {
      return false;
    }
  };

  return (
    <Card className={cn(
      "mb-4 overflow-hidden transition-all duration-200 border",
      isExpanded ? "border-gold/30" : "border-gray-200 dark:border-navy-lighter/20"
    )}
    style={{ 
      borderLeftColor: category.color || "#F5C441",
      borderLeftWidth: '4px'
    }}>
      <div 
        className={cn(
          "flex items-center justify-between px-4 py-3 cursor-pointer",
          isExpanded ? "bg-gold/10 dark:bg-gold/5" : "bg-gray-50 dark:bg-navy-deeper"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <div 
            className="w-3 h-3 rounded-full mr-3"
            style={{ backgroundColor: category.color || "#F5C441" }}
          ></div>
          <h3 className="font-medium text-navy-dark dark:text-gold">
            {category.name} ({documents.length})
          </h3>
        </div>
        <Button variant="ghost" size="sm" className="p-1">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      
      {isExpanded && (
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200 dark:divide-navy-lighter/20">
            {documents.map(document => (
              <div 
                key={document.id} 
                className="p-4 hover:bg-gray-50 dark:hover:bg-navy-light/10 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start space-x-3 mb-2 md:mb-0">
                    <FileIcon className="h-5 w-5 text-navy dark:text-gold mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-white">
                        {document.name}
                        {document.viewed && (
                          <span className="ml-2 inline-flex items-center text-xs text-green-700 dark:text-green-400">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Visualizado
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {document.original_filename || document.filename || "Sem nome original"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-3">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Enviado:</span>
                        <span className="ml-2 text-gray-700 dark:text-gray-300">{formatDate(document.uploaded_at)}</span>
                      </div>
                      <div>
                        {document.expires_at && (
                          <div className={isExpired(document.expires_at) ? "text-red-500" : ""}>
                            <span className="text-gray-500 dark:text-gray-400">Expira:</span>
                            <span className="ml-2">
                              {isExpired(document.expires_at) && <AlertCircle className="inline h-3 w-3 mr-1" />}
                              {formatDate(document.expires_at)}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {document.subcategory && (
                        <div className="col-span-2">
                          <span className="text-gray-500 dark:text-gray-400">Subcategoria:</span>
                          <span className="ml-2 text-gray-700 dark:text-gray-300">{document.subcategory}</span>
                        </div>
                      )}
                      
                      {document.observations && (
                        <div className="col-span-2">
                          <span className="text-gray-500 dark:text-gray-400">Observações:</span>
                          <span className="ml-2 text-gray-700 dark:text-gray-300">{document.observations}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      {loadingDocumentIds.has(document.id) ? (
                        <div className="flex items-center justify-center w-8 h-8">
                          <LoadingSpinner size="sm" />
                        </div>
                      ) : (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-gold/30 hover:bg-gold/10 dark:border-gold/20 dark:hover:bg-gold/10"
                            onClick={() => onDownload(document)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-blue-500/30 hover:bg-blue-50 dark:border-blue-400/20 dark:hover:bg-blue-500/10"
                            onClick={() => onEdit(document)}
                          >
                            <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-red-500/30 hover:bg-red-50 dark:border-red-400/20 dark:hover:bg-red-500/10"
                            onClick={() => onDelete(document)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {documents.length === 0 && (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                Nenhum documento nesta categoria
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};
