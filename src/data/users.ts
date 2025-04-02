
export interface User {
  id: string;
  name: string;
  email: string;
  documents: Document[];
}

export interface Document {
  id: string;
  name: string;
  uploadedAt: string;
  mockUrl: string;
}

// Lista de usuários predefinidos
export const predefinedUsers: User[] = [
  {
    id: "user-001",
    name: "Cliente Exemplo",
    email: "cliente@example.com",
    documents: [
      {
        id: "doc-001",
        name: "Declaração Anual 2023",
        uploadedAt: "2023-12-15T10:30:00Z",
        mockUrl: "https://example.com/docs/declaracao2023.pdf"
      },
      {
        id: "doc-002",
        name: "Recibo Imposto de Renda",
        uploadedAt: "2023-11-20T14:45:00Z",
        mockUrl: "https://example.com/docs/recibo_ir.pdf"
      }
    ]
  },
  {
    id: "user-002",
    name: "Empresa ABC Ltda",
    email: "contato@empresaabc.com.br",
    documents: [
      {
        id: "doc-003",
        name: "Balancete Trimestral",
        uploadedAt: "2023-10-05T09:15:00Z",
        mockUrl: "https://example.com/docs/balancete_q3_2023.pdf"
      }
    ]
  }
];

// Get all users
export const getAllUsers = (): User[] => {
  return predefinedUsers;
};

// Add a new user
export const addUser = (user: User): void => {
  predefinedUsers.push(user);
};

// Update a user
export const updateUser = (updatedUser: User): void => {
  const index = predefinedUsers.findIndex(user => user.id === updatedUser.id);
  if (index !== -1) {
    predefinedUsers[index] = updatedUser;
  }
};

// Add document to a user
export const addDocumentToUser = (userId: string, document: Document): void => {
  const userIndex = predefinedUsers.findIndex(user => user.id === userId);
  
  if (userIndex !== -1) {
    predefinedUsers[userIndex].documents.push(document);
  }
};

// Get user by email
export const getUserByEmail = (email: string): User | undefined => {
  return predefinedUsers.find(user => user.email === email);
};

// Remove user by ID
export const removeUser = (userId: string): void => {
  const updatedUsers = predefinedUsers.filter(user => user.id !== userId);
  // Replace the original array with the filtered one
  predefinedUsers.splice(0, predefinedUsers.length, ...updatedUsers);
};
