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

  const documentsByMonth = useMemo(() => {
    const groups = new Map<string, Document[]>();
    sortedDocuments.forEach((doc) => {
      const date = new Date(doc.uploaded_at);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const current = groups.get(key) || [];
      current.push(doc);
      groups.set(key, current);
    });
    return Array.from(groups.entries()).map(([key, docs]) => {
      const date = new Date(docs[0].uploaded_at);
      return { key, label: new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date), documents: docs };
    });
  }, [sortedDocuments]);

  const stats = [
    { label: "Disponíveis", value: activeDocuments.length, icon: Files },
    { label: "Novos para você", value: newCount, icon: Sparkles },
    { label: "Já visualizados", value: viewedCount, icon: FileCheck2 },
    { label: "Vencem em breve", value: expiringCount, icon: FileClock },
  ];

  return <div className="client-documents space-y-5">
    <section className="client-documents-hero">
      <div className="client-documents-hero-copy">
        <p className="client-eyebrow">Visão geral</p>
        <h2>O que precisa da sua atenção.</h2>
        <p>Veja os documentos mais recentes, identifique novidades e acesse seus arquivos quando precisar.</p>
      </div>
      <div className="client-document-stats">
        {stats.map(({ label, value, icon: Icon }) => <div key={label} className="client-document-stat"><span className="client-document-stat-icon"><Icon className="h-4 w-4" /></span><div><strong>{value}</strong><span>{label}</span></div></div>)}
      </div>
    </section>

    <section className="client-documents-panel">
      <DocumentSearchAndFilter searchQuery={searchQuery} setSearchQuery={setSearchQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} sortBy={sortBy} setSortBy={setSortBy} />
      <DocumentResultsSummary count={sortedDocuments.length} searchQuery={searchQuery} statusFilter={statusFilter} />
      {documentsByMonth.length > 0 ? documentsByMonth.map((group) => <section key={group.key} className="client-document-month" aria-labelledby={`month-${group.key}`}>
        <div className="client-document-month-heading"><div><p className="client-eyebrow">Competência</p><h3 id={`month-${group.key}`}>{group.label}</h3></div><span>{group.documents.length} {group.documents.length === 1 ? "documento" : "documentos"}</span></div>
        <DocumentGrid documents={group.documents} formatDate={formatDate} isDocumentExpired={isDocumentExpired} daysUntilExpiration={daysUntilExpiration} refreshDocuments={refreshDocuments} loadingDocumentIds={loadingDocumentIds} handleDownload={handleDownload} categories={categories} />
      </section>) : <DocumentEmptyState searchQuery={searchQuery} />}
    </section>
  </div>;
};
