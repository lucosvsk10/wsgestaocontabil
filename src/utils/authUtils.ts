
// Re-export all auth utilities from their respective modules
export type { UserData, Document } from './auth/types';
export { checkIsAdmin } from './auth/userChecks';
export { fetchUserDataFromDB, ensureUserProfile } from './auth/userProfile';
export { signInWithEmail, signOutUser, signUpNewUser } from './auth/authentication';
export { uploadUserDocument, getUserDocumentsFromDB } from './documents/documentManagement';
