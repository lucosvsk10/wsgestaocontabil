
/**
 * Formats a byte size into a human-readable string
 * @param size Size in bytes
 * @returns Formatted size string (B, KB, MB, GB)
 */
export const formatSize = (size: number): string => {
  if (size === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(size) / Math.log(1024));
  const value = (size / Math.pow(1024, i)).toFixed(2);
  return `${value} ${sizes[i]}`;
};
