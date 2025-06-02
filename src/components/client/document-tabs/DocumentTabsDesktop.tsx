
import { useState, useMemo } from "react";
import { Document, DocumentCategory } from "@/types/common";
import { DocumentGrid } from "../document-table/DocumentGrid";
import { DocumentSearchAndFilter } from "../document-table/DocumentSearchAndFilter";
import { CategoryTabs } from "../document-table/CategoryTabs";
import { useDocumentActions } from "@/hooks/document/useDocumentActions";
import { motion } from "framer-motion";

interface DocumentTabsDesktopProps {
  documentsByCategory: Record<string, Document[]>;
  categories: DocumentCategory[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
}

export const DocumentTabsDesktop = ({
  documentsByCategory,
  categories,
  activeCategory,
  onCategoryChange,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  refreshDocuments
}: DocumentTabsDesktopProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  
  const { loadingDocumentIds, handleDownload } = useDocumentActions();

  // Filter documents based on search, status, and date
  const filteredDocuments = useMemo(() => {
    const categoryDocuments = documentsByCategory[activeCategory] || [];
    
    return categoryDocuments.filter(doc => {
      // Search filter
      if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "new" && doc.viewed) return false;
        if (statusFilter === "viewed" && !doc.viewed) return false;
        if (statusFilter === "expired" && !isDocumentExpired(doc.expires_at)) return false;
        if (statusFilter === "active" && isDocumentExpired(doc.expires_at)) return false;
      }
      
      // Date filter
      if (dateFilter) {
        const docDate = new Date(doc.uploaded_at).toISOString().split('T')[0];
        if (docDate !== dateFilter) return false;
      }
      
      return true;
    });
  }, [documentsByCategory, activeCategory, searchQuery, statusFilter, dateFilter, isDocumentExpired]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateFilter("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Category Tabs */}
      <CategoryTabs
        categories={categories}
        documentsByCategory={documentsByCategory}
        activeCategory={activeCategory}
        onCategoryChange={onCategoryChange}
      />

      {/* Search and Filters */}
      <DocumentSearchAndFilter
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        onClearFilters={handleClearFilters}
      />

      {/* Documents Grid */}
      {filteredDocuments.length > 0 ? (
        <DocumentGrid
          documents={filteredDocuments}
          formatDate={formatDate}
          isDocumentExpired={isDocumentExpired}
          daysUntilExpiration={daysUntilExpiration}
          refreshDocuments={refreshDocuments}
          loadingDocumentIds={loadingDocumentIds}
          handleDownload={handleDownload}
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">
            {searchQuery || statusFilter !== "all" || dateFilter
              ? "Nenhum documento encontrado com os filtros aplicados."
              : "Nenhum documento encontrado nesta categoria."}
          </p>
        </div>
      )}
    </motion.div>
  );
};
