
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Calendar } from "lucide-react";
import { DocumentGrid } from './document-table/DocumentGrid';
import { useDocumentActions } from '@/hooks/document/useDocumentActions';
import { Document } from "@/types/admin";
import { DocumentCategory } from "@/types/common";

interface DocumentTabsProps {
  documents: Document[];
  allDocuments: Document[];
  documentsByCategory: Record<string, Document[]>;
  categories: DocumentCategory[];
  setSelectedCategory: (category: string | null) => void;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
  activeCategory: string;
}

export const DocumentTabs = ({
  allDocuments,
  documentsByCategory,
  categories,
  setSelectedCategory,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments,
  activeCategory
}: DocumentTabsProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('recent');
  
  const { loadingDocumentIds, handleDownload } = useDocumentActions();

  // Get current category name
  const getCurrentCategoryName = () => {
    if (!activeCategory) return 'Documentações';
    const category = categories.find(cat => cat.id === activeCategory);
    return category ? category.name : 'Documentações';
  };

  // Get documents for current category
  const getCurrentDocuments = () => {
    if (!activeCategory) return allDocuments;
    return documentsByCategory[activeCategory] || [];
  };

  // Filter documents based on search and filters
  const filteredDocuments = getCurrentDocuments().filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'viewed') matchesStatus = doc.viewed;
    if (statusFilter === 'unviewed') matchesStatus = !doc.viewed;
    if (statusFilter === 'expired') matchesStatus = isDocumentExpired(doc.expires_at);
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header with title and category */}
      <div className="space-y-4">
        <h1 className="text-2xl font-light text-[#efc349]">
          Documentos - {getCurrentCategoryName()}
        </h1>
        
        {/* Category tabs */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!activeCategory ? "default" : "ghost"}
            onClick={() => setSelectedCategory(null)}
            className={`rounded-lg ${
              !activeCategory 
                ? "bg-[#efc349] text-[#0b1320] hover:bg-[#d4a017]" 
                : "bg-[#2a3441] text-gray-300 hover:bg-[#3a4451] hover:text-white border-[#efc349]/20"
            }`}
          >
            Documentações
            <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded">
              {allDocuments.length}
            </span>
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? "default" : "ghost"}
              onClick={() => setSelectedCategory(category.id)}
              className={`rounded-lg ${
                activeCategory === category.id 
                  ? "bg-[#efc349] text-[#0b1320] hover:bg-[#d4a017]" 
                  : "bg-[#2a3441] text-gray-300 hover:bg-[#3a4451] hover:text-white border-[#efc349]/20"
              }`}
            >
              {category.name}
              <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded">
                {documentsByCategory[category.id]?.length || 0}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Current category indicator */}
      <div className="flex items-center gap-2 text-sm">
        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
        <span className="text-red-400">{getCurrentCategoryName()}</span>
      </div>

      {/* Search and filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-[#2a3441] border-[#efc349]/20 text-white placeholder:text-gray-400 focus:border-[#efc349]"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-[#2a3441] border-[#efc349]/20 text-white">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent className="bg-[#2a3441] border-[#efc349]/20">
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="viewed">Visualizado</SelectItem>
            <SelectItem value="unviewed">Não visualizado</SelectItem>
            <SelectItem value="expired">Expirado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="bg-[#2a3441] border-[#efc349]/20 text-white">
            <SelectValue placeholder="Data: Recentes..." />
          </SelectTrigger>
          <SelectContent className="bg-[#2a3441] border-[#efc349]/20">
            <SelectItem value="recent">Data: Recentes...</SelectItem>
            <SelectItem value="oldest">Data: Antigos...</SelectItem>
            <SelectItem value="expiring">Vencendo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="text-gray-400 text-sm">
        Exibindo {filteredDocuments.length} documento{filteredDocuments.length !== 1 ? 's' : ''}
      </div>

      {/* Documents grid */}
      <DocumentGrid
        documents={filteredDocuments}
        formatDate={formatDate}
        isDocumentExpired={isDocumentExpired}
        daysUntilExpiration={daysUntilExpiration}
        refreshDocuments={refreshDocuments}
        loadingDocumentIds={loadingDocumentIds}
        handleDownload={handleDownload}
      />
    </div>
  );
};
