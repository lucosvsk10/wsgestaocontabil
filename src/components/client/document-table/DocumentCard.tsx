import { Download } from "lucide-react";
import { Document } from "@/utils/auth/types";

interface DocumentCardProps {
  doc: Document;
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
  loadingDocumentIds: Set<string>;
  handleDownload: (doc: Document) => Promise<void>;
  categoryColor?: string;
  categories?: Array<{ id: string; name: string; color?: string }>;
}

export const DocumentCard = ({
  doc,
  formatDate,
  isDocumentExpired,
  daysUntilExpiration,
  loadingDocumentIds,
  handleDownload,
  categoryColor = "#dbe7f4",
  categories = [],
}: DocumentCardProps) => {
  const expired = isDocumentExpired(doc.expires_at);
  const expirationText = daysUntilExpiration(doc.expires_at);
  const categoryName = categories.find(cat => cat.id === doc.category)?.name || "Documento";
  const isLoading = loadingDocumentIds.has(doc.id);
  const status = expired ? "Expirado" : !doc.viewed ? "Novo" : "Visualizado";

  return (
    <article className={"client-document-modern-card " + (expired ? "is-expired" : !doc.viewed ? "is-new" : "")}>
      <div className="client-document-modern-topline">
        <span className="client-document-modern-category" style={{ color: categoryColor }}>
          {categoryName}
        </span>
        <span className={"client-document-modern-status " + (expired ? "is-expired" : !doc.viewed ? "is-new" : "is-viewed")}>
          {status}
        </span>
      </div>

      <div className="client-document-modern-body">
        <h3>{doc.name}</h3>
        {doc.observations && <p>{doc.observations}</p>}
      </div>

      <div className="client-document-modern-meta">
        <div>
          <span>Enviado</span>
          <strong>{formatDate(doc.uploaded_at)}</strong>
        </div>
        <div>
          <span>Validade</span>
          <strong>{expired ? "Expirado" : expirationText || "Sem expiração"}</strong>
        </div>
      </div>

      <button
        className="client-document-modern-action"
        onClick={() => void handleDownload(doc)}
        disabled={expired || isLoading}
      >
        <Download className="h-4 w-4" />
        <span>{isLoading ? "Preparando..." : expired ? "Indisponível" : doc.viewed ? "Baixar novamente" : "Visualizar e baixar"}</span>
      </button>
    </article>
  );
};
