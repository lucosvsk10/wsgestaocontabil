
/**
 * Check if user is an administrator
 * @param userData User data from database
 * @param email User email (optional backup check)
 * @returns Boolean indicating if user is admin
 */
export const checkIsAdmin = (userData: any, email?: string | null): boolean => {
  // Check if user has admin role in user data
  if (userData && userData.role === 'admin') {
    return true;
  }
  
  // Fallback check for specific admin emails
  if (email) {
    const adminEmails = [
      'admin@wsgestaocontabil.com.br',
      'admin@example.com',
      'dev@example.com'
    ];
    return adminEmails.includes(email.toLowerCase());
  }
  
  return false;
};

/**
 * Check if user has access to specific document
 * @param userId Current user ID
 * @param docUserId Document owner ID
 * @param docStorageKey Document storage key
 * @returns Boolean indicating if user has access to document
 */
export const hasDocumentAccess = (
  userId: string | undefined,
  docUserId: string,
  docStorageKey: string | null
): boolean => {
  if (!userId) return false;
  
  // Direct ownership
  if (docUserId === userId) return true;
  
  // Check storage key pattern (if document was stored in user's folder)
  if (docStorageKey && docStorageKey.startsWith(`${userId}/`)) {
    return true;
  }
  
  return false;
};
