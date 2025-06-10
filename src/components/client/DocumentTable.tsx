
import { useState } from "react";
import { Document } from "@/utils/auth/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentActions } from "@/hooks/document/useDocumentActions";
import { DocumentSearchAndFilter } from "./document-table/DocumentSearchAndFilter";
import { DocumentResultsSummary } from "./document-table/DocumentResultsSummary";
import { DocumentEmptyState } from "./document-table/DocumentEmptyState";
import { DocumentGrid } from "./document-table/DocumentGrid";

interface DocumentTableProps {
  documents: Document[];
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
  categories?: Array<{ id: string; name: string; color?: string; }>;
}

export const DocumentTable = ({ 
  documents, 
  formatDate, 
  isDocumentExpired, 
  daysUntilExpiration,
  refreshDocuments,
  categories = []
}: DocumentTableProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { loadingDocumentIds, handleDownload } = useDocumentActions();
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  
  // Filter the documents based on search and filters - only show active documents for clients
  const filteredDocuments = documents.filter(doc => {
    // Clientes só veem documentos ativos
    if (doc.status && doc.status !== 'active') {
      return false;
    }
    
    // Apply search query
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (doc.filename || doc.original_filename || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply status filter
    const matchesStatus = 
      statusFilter === "all" ? true :
      statusFilter === "new" ? !doc.viewed :
      statusFilter === "viewed" ? doc.viewed :
      statusFilter === "expired" ? isDocumentExpired(doc.expires_at) :
      statusFilter === "active" ? !isDocumentExpired(doc.expires_at) : 
      true;
      
    return matchesSearch && matchesStatus;
  });
  
  // Sort the filtered documents
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "date-asc":
        return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
      case "date-desc":
      default:
        return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
    }
  });

  return (
    <div className="space-y-6 bg-white dark:bg-[#020817] min-h-screen">
      {/* Search and Filters */}
      <div className="bg-transparent border border-gray-200 dark:border-[#efc349]/30 rounded-xl p-6 shadow-sm">
        <DocumentSearchAndFilter
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />
      </div>

      {/* Results Summary */}
      <div className="bg-transparent border border-gray-200 dark:border-[#efc349]/30 rounded-xl p-4 shadow-sm">
        <DocumentResultsSummary
          count={sortedDocuments.length}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
        />
      </div>
      
      {/* Documents Grid or Empty State */}
      {sortedDocuments.length > 0 ? (
        <div className="bg-transparent border border-gray-200 dark:border-[#efc349]/30 rounded-xl shadow-sm">
          <DocumentGrid
            documents={sortedDocuments}
            formatDate={formatDate}
            isDocumentExpired={isDocumentExpired}
            daysUntilExpiration={daysUntilExpiration}
            refreshDocuments={refreshDocuments}
            loadingDocumentIds={loadingDocumentIds}
            handleDownload={handleDownload}
            categories={categories}
          />
        </div>
      ) : (
        <div className="bg-transparent border border-gray-200 dark:border-[#efc349]/30 rounded-xl p-8 shadow-sm">
          <DocumentEmptyState searchQuery={searchQuery} />
        </div>
      )}
    </div>
  );
};
