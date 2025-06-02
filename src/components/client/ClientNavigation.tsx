
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Calculator, Megaphone, Calendar, Building } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ClientNavigationProps {
  documents: any[];
  allDocuments: any[];
  documentsByCategory: Record<string, any[]>;
  categories: any[];
  setSelectedCategory: (category: string | null) => void;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
  activeCategory: string;
}

export const ClientNavigation = ({
  documents,
  allDocuments,
  documentsByCategory,
  categories,
  setSelectedCategory,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments,
  activeCategory
}: ClientNavigationProps) => {
  // Este componente não será mais usado no novo design
  // Mantido apenas para compatibilidade
  return (
    <div className="text-center py-8 text-gray-400">
      <p className="font-extralight">
        Este componente foi substituído pelo novo design da área do cliente.
      </p>
    </div>
  );
};
