
/**
 * Formats a byte size into a human-readable string
 * @param size Size in bytes
 * @returns Formatted size string (B, KB, MB)
 */
export const formatSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};
