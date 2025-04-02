
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth, getUserDoc } from '@/lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  userDocData: any;
  userLoading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userDocData: null,
  userLoading: true,
  isAdmin: false
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userDocData, setUserDocData] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          const userData = await getUserDoc(user.uid);
          setUserDocData(userData);
          setIsAdmin(userData?.role === 'admin');
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUserDocData(null);
        setIsAdmin(false);
      }
      
      setUserLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userDocData,
    userLoading,
    isAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
