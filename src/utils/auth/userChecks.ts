
/**
 * Check if user is an administrator
 * @param userData User data from database
 * @param email User email (optional, kept for backward compatibility but NOT used for admin check)
 * @returns Boolean indicating if user is admin
 */
export const checkIsAdmin = (userData: any, email?: string | null): boolean => {
  // SECURITY: Only check database role - NO hardcoded emails
  // Admin status is determined solely by the 'admin' role in the users table
  if (userData && userData.role === 'admin') {
    return true;
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
