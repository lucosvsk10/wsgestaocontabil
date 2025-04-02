
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// Define a proper type for user data
export interface UserDocument {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  createdAt?: string;
  [key: string]: any; // Allow for additional fields
}

// Configuração do Firebase - substitua pelos seus valores
const firebaseConfig = {
  apiKey: "AIzaSyCMFlVNoUndO46weyHz3g_pcZvm38FGoWk",
  authDomain: "ws-gestao.firebaseapp.com",
  projectId: "ws-gestao",
  storageBucket: "ws-gestao.appspot.com",
  messagingSenderId: "47664277006",
  appId: "1:47664277006:web:22078461f12dc008d37e5f",
  measurementId: "G-895JT6WD7F"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Funções de autenticação
export const loginWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const createUser = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    throw error;
  }
};

// Funções de banco de dados
export const addUserToFirestore = async (userId: string, userData: any) => {
  try {
    await setDoc(doc(db, "users", userId), {
      ...userData,
      role: userData.role || "client",
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    throw error;
  }
};

export const getUserDoc = async (userId: string): Promise<UserDocument | null> => {
  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as UserDocument;
    }
    
    return null;
  } catch (error) {
    throw error;
  }
};

export const getAllUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    const users: any[] = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    return users;
  } catch (error) {
    throw error;
  }
};

export const deleteUser = async (userId: string) => {
  try {
    await deleteDoc(doc(db, "users", userId));
    return true;
  } catch (error) {
    throw error;
  }
};

export const updateUserData = async (userId: string, data: any) => {
  try {
    await updateDoc(doc(db, "users", userId), data);
    return true;
  } catch (error) {
    throw error;
  }
};

// Funções de documentos/arquivos
export const uploadDocument = async (userId: string, file: File, metadata: any) => {
  try {
    const documentId = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `documents/${userId}/${documentId}`);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    // Adicionar registro do documento no Firestore
    await addDoc(collection(db, `users/${userId}/documents`), {
      name: metadata.name || file.name,
      originalFilename: file.name,
      fileUrl: downloadURL,
      uploadedAt: new Date().toISOString(),
      size: file.size,
      type: file.type
    });
    
    return downloadURL;
  } catch (error) {
    throw error;
  }
};

export const getUserDocuments = async (userId: string) => {
  try {
    const querySnapshot = await getDocs(collection(db, `users/${userId}/documents`));
    const documents: any[] = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    return documents;
  } catch (error) {
    throw error;
  }
};

export const deleteDocument = async (userId: string, documentId: string, fileUrl: string) => {
  try {
    // Remover do Firestore
    await deleteDoc(doc(db, `users/${userId}/documents`, documentId));
    
    // Remover do Storage
    const storageRef = ref(storage, fileUrl);
    await deleteObject(storageRef);
    
    return true;
  } catch (error) {
    throw error;
  }
};

// Exportar instâncias
export { auth, db, storage };
