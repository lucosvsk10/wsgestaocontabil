
import { UserData } from './types';

// Check if user is admin by role or email
export const checkIsAdmin = (userData: UserData | null, userEmail: string | null): boolean => {
  return (
    userData?.role === 'admin' || 
    userEmail === 'wsgestao@gmail.com' ||
    userEmail === 'l09022007@gmail.com'
  );
};
