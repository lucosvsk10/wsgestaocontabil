
import { Document as AdminDocument, DocumentCategory as AdminDocumentCategory } from "@/types/admin";
import { Document as CommonDocument, DocumentCategory as CommonDocumentCategory } from "@/types/common";

/**
 * Convert between document types to ensure compatibility between components
 */
export function convertToAdminDocument(doc: CommonDocument): AdminDocument {
  return {
    ...doc,
    storage_key: doc.storage_key || '',
  } as AdminDocument;
}

export function convertToCommonDocument(doc: AdminDocument): CommonDocument {
  return doc as CommonDocument;
}

export function convertToAdminCategory(category: CommonDocumentCategory): AdminDocumentCategory {
  return category as AdminDocumentCategory;
}

export function convertToCommonCategory(category: AdminDocumentCategory): CommonDocumentCategory {
  return {
    ...category,
    created_at: category.created_at || new Date().toISOString(),
  } as CommonDocumentCategory;
}

export function convertToAdminDocuments(docs: CommonDocument[]): AdminDocument[] {
  return docs.map(convertToAdminDocument);
}

export function convertToCommonDocuments(docs: AdminDocument[]): CommonDocument[] {
  return docs.map(convertToCommonDocument);
}

export function convertToAdminCategories(categories: CommonDocumentCategory[]): AdminDocumentCategory[] {
  return categories.map(convertToAdminCategory);
}

export function convertToCommonCategories(categories: AdminDocumentCategory[]): CommonDocumentCategory[] {
  return categories.map(convertToCommonCategory);
}
