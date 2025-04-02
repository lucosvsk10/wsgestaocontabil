
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// Configuração do Firebase - substitua pelos seus valores
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Você precisará substituir por sua chave API do Firebase
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
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

export const getUserDoc = async (userId: string) => {
  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
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
