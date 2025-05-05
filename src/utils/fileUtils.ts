/**
 * Normalizes a filename by removing special characters and replacing spaces with underscores
 * @param filename The original filename to normalize
 * @returns The normalized filename
 */
export const normalizeFilename = (filename: string): string => {
  if (!filename) return 'documento';
  
  // Keep file extension separate
  const parts = filename.split('.');
  const extension = parts.length > 1 ? parts.pop() : '';
  const name = parts.join('.');
  
  // Replace special characters and spaces
  const normalized = name
    .normalize('NFD')                   // Normalize to decomposed form
    .replace(/[\u0300-\u036f]/g, '')   // Remove diacritics
    .replace(/[^a-zA-Z0-9_-]/g, '_')   // Replace special chars with underscore
    .replace(/_{2,}/g, '_')            // Replace multiple underscores with a single one
    .toLowerCase();
    
  return extension ? `${normalized}.${extension.toLowerCase()}` : normalized;
};

/**
 * Generates a storage key for a document in the format userId/normalizedFilename
 * @param userId The user ID
 * @param filename The original filename
 * @returns The storage key for the document
 */
export const generateDocumentStorageKey = (userId: string, filename: string): string => {
  const normalizedFilename = normalizeFilename(filename);
  return `${userId}/${normalizedFilename}`;
};
