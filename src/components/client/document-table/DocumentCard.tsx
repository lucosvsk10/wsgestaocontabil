import { AlertTriangle, CalendarDays, CheckCircle2, Download, FileText, Sparkles } from "lucide-react";
import { Document } from "@/utils/auth/types";
import { Button } from "@/components/ui/button";

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

export const DocumentCard = ({ doc, formatDate, isDocumentExpired, daysUntilExpiration, loadingDocumentIds, handleDownload, categoryColor = "#efc349", categories = [] }: DocumentCardProps) => {
  const expired = isDocumentExpired(doc.expires_at);
  const expirationText = daysUntilExpiration(doc.expires_at);
  const categoryName = categories.find(cat => cat.id === doc.category)?.name || "Documento";
  const isLoading = loadingDocumentIds.has(doc.id);

  return <article className={`client-document-card ${!doc.viewed && !expired ? "is-new" : ""} ${expired ? "is-expired" : ""}`}>
    <div className="client-document-card-head">
      <div>
        <div className="client-document-icon" style={{ color: categoryColor }}><FileText className="h-5 w-5" /></div>
        <p className="client-document-category">{categoryName}</p>
      </div>
      {!doc.viewed && !expired ? <span className="client-new-badge"><Sparkles className="h-3 w-3" />Novo</span> : expired ? <span className="client-expired-badge"><AlertTriangle className="h-3 w-3" />Expirado</span> : <span className="client-viewed-badge"><CheckCircle2 className="h-3 w-3" />Visualizado</span>}
    </div>

    <h3 className="client-document-name">{doc.name}</h3>

    <div className="client-document-meta">
      <div className="client-document-meta-row"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Enviado</span><strong>{formatDate(doc.uploaded_at)}</strong></div>
      <div className="client-document-meta-row"><span>Validade</span><strong>{expired ? "Expirado" : expirationText || "Sem expiração"}</strong></div>
      {doc.observations && <p className="line-clamp-2 rounded-xl bg-muted/25 px-3 py-2.5 leading-5 text-muted-foreground">{doc.observations}</p>}
    </div>

    <div className="client-document-actions">
      {expired ? <div className="flex min-h-[42px] items-center justify-center gap-2 rounded-md bg-muted text-xs font-medium text-muted-foreground"><AlertTriangle className="h-4 w-4" />Documento expirado</div> : <Button onClick={() => handleDownload(doc)} disabled={isLoading}><Download className="mr-2 h-4 w-4" />{isLoading ? "Preparando..." : doc.viewed ? "Baixar novamente" : "Visualizar e baixar"}</Button>}
    </div>
  </article>;
};
