
import { useState, useEffect } from 'react';
import { Document } from '@/utils/auth/types';
import { DocumentTable } from '../DocumentTable';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useIsMobile } from '@/hooks/use-mobile';

interface CategoryDocumentTableProps {
  categoryName: string;
  categoryColor?: string; // Cor associada à categoria
  documents: Document[];
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expirationDate: string) => boolean;
  daysUntilExpiration: (expirationDate: string) => string;
  refreshDocuments: () => void;
  initiallyExpanded?: boolean;
}

export const CategoryDocumentTable = ({
  categoryName,
  categoryColor = '#efc349', // Cor padrão dourada se não for fornecida
  documents,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments,
  initiallyExpanded = true
}: CategoryDocumentTableProps) => {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [expandedValue, setExpandedValue] = useState<string>(initiallyExpanded ? 'item-1' : '');

  // Ajusta o estado expandido quando a prop initiallyExpanded muda
  useEffect(() => {
    setIsExpanded(initiallyExpanded);
    setExpandedValue(initiallyExpanded ? 'item-1' : '');
  }, [initiallyExpanded]);

  const handleAccordionChange = (value: string) => {
    setExpandedValue(value);
    setIsExpanded(value === 'item-1');
  };

  return (
    <div className="mb-8">
      <Accordion
        type="single"
        collapsible
        value={expandedValue}
        onValueChange={handleAccordionChange}
        className={`rounded-xl overflow-hidden ${isMobile ? 'border dark:border-gold/30' : ''}`}
      >
        <AccordionItem value="item-1" className="border-0">
          <AccordionTrigger 
            className={`px-4 py-3 text-lg font-medium dark:bg-deepNavy dark:text-gold ${
              isMobile ? '' : 'dark:border dark:border-gold/30 rounded-t-xl'
            }`}
            style={{ 
              borderLeft: categoryColor ? `4px solid ${categoryColor}` : '4px solid #efc349',
              paddingLeft: '16px'
            }}
          >
            {categoryName} <span className="ml-2 text-gray-500 dark:text-gray-400">({documents.length})</span>
          </AccordionTrigger>
          
          <AccordionContent className={`p-0 ${isMobile ? '' : 'dark:border-x dark:border-b dark:border-gold/30 rounded-b-xl'}`}>
            <div className="p-4 dark:bg-deepNavy">
              <DocumentTable 
                documents={documents} 
                formatDate={formatDate} 
                isDocumentExpired={isDocumentExpired} 
                daysUntilExpiration={daysUntilExpiration} 
                refreshDocuments={refreshDocuments}
                categoryColor={categoryColor}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
