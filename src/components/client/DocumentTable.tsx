import { useMemo, useState } from "react";
import { FileCheck2, FileClock, Files, Sparkles } from "lucide-react";
import { Document } from "@/utils/auth/types";
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
  categories?: Array<{ id: string; name: string; color?: string }>;
}

export const DocumentTable = ({ documents, formatDate, isDocumentExpired, daysUntilExpiration, refreshDocuments, categories = [] }: DocumentTableProps) => {
  const { loadingDocumentIds, handleDownload } = useDocumentActions();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");

  const activeDocuments = useMemo(() => documents.filter(doc => !doc.status || doc.status === "active"), [documents]);
  const newCount = activeDocuments.filter(doc => !doc.viewed && !isDocumentExpired(doc.expires_at)).length;
  const viewedCount = activeDocuments.filter(doc => doc.viewed).length;
  const expiringCount = activeDocuments.filter(doc => {
    if (!doc.expires_at || isDocumentExpired(doc.expires_at)) return false;
    const diff = Math.ceil((new Date(doc.expires_at).getTime() - Date.now()) / 86400000);
    return diff >= 0 && diff <= 15;
  }).length;

  const sortedDocuments = useMemo(() => activeDocuments.filter(doc => {
    const filename = doc.filename || doc.original_filename || "";
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" ? true : statusFilter === "new" ? !doc.viewed : statusFilter === "viewed" ? doc.viewed : statusFilter === "expired" ? isDocumentExpired(doc.expires_at) : statusFilter === "active" ? !isDocumentExpired(doc.expires_at) : true;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === "name-asc") return a.name.localeCompare(b.name);
    if (sortBy === "name-desc") return b.name.localeCompare(a.name);
    if (sortBy === "date-asc") return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
    return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
  }), [activeDocuments, searchQuery, statusFilter, sortBy, isDocumentExpired]);

  const stats = [
    { label: "Disponíveis", value: activeDocuments.length, icon: Files },
    { label: "Novos para você", value: newCount, icon: Sparkles },
    { label: "Já visualizados", value: viewedCount, icon: FileCheck2 },
    { label: "Vencem em breve", value: expiringCount, icon: FileClock },
  ];

  return <div className="client-documents space-y-5">
    <section className="client-documents-hero">
      <div className="client-documents-hero-copy">
        <p className="client-eyebrow">Central de documentos</p>
        <h2>Seus documentos, organizados e fáceis de encontrar.</h2>
        <p>Consulte os arquivos enviados pelo escritório, acompanhe novidades e baixe o que precisar.</p>
      </div>
      <div className="client-document-stats">
        {stats.map(({ label, value, icon: Icon }) => <div key={label} className="client-document-stat"><span className="client-document-stat-icon"><Icon className="h-4 w-4" /></span><div><strong>{value}</strong><span>{label}</span></div></div>)}
      </div>
    </section>

    <section className="client-documents-panel">
      <DocumentSearchAndFilter searchQuery={searchQuery} setSearchQuery={setSearchQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} sortBy={sortBy} setSortBy={setSortBy} />
      <DocumentResultsSummary count={sortedDocuments.length} searchQuery={searchQuery} statusFilter={statusFilter} />
      {sortedDocuments.length > 0 ? <DocumentGrid documents={sortedDocuments} formatDate={formatDate} isDocumentExpired={isDocumentExpired} daysUntilExpiration={daysUntilExpiration} refreshDocuments={refreshDocuments} loadingDocumentIds={loadingDocumentIds} handleDownload={handleDownload} categories={categories} /> : <DocumentEmptyState searchQuery={searchQuery} />}
    </section>
  </div>;
};
