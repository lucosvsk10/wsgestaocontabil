
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
  documents: Document[];
}

export interface Document {
  id: string;
  name: string;
  uploadedAt: string;
  mockUrl: string;
}

// Predefined users that will be available across all devices
export const predefinedUsers: User[] = [
  {
    id: "admin-001",
    name: "Administrador",
    email: "wsgestao@gmail.com",
    password: "081914",
    isAdmin: true,
    documents: []
  },
  {
    id: "admin-002",
    name: "Lucas Admin",
    email: "lucasws@gmail.com",
    password: "lucas1914",
    isAdmin: true,
    documents: []
  },
  {
    id: "user-001",
    name: "Cliente Exemplo",
    email: "cliente@example.com",
    password: "cliente123",
    isAdmin: false,
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
    password: "abc123",
    isAdmin: false,
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

// Initialize the user data from predefined users when the app loads
export const initializeUserData = (): void => {
  // Always initialize data to ensure predefined users are available
  localStorage.setItem("registeredUsers", JSON.stringify(predefinedUsers));
  console.log("User data initialized:", predefinedUsers);
};

// Get all users
export const getAllUsers = (): User[] => {
  const usersData = localStorage.getItem("registeredUsers");
  return usersData ? JSON.parse(usersData) : [];
};

// Add a new user
export const addUser = (user: User): void => {
  const users = getAllUsers();
  users.push(user);
  localStorage.setItem("registeredUsers", JSON.stringify(users));
};

// Update a user
export const updateUser = (updatedUser: User): void => {
  const users = getAllUsers();
  const index = users.findIndex(user => user.id === updatedUser.id);
  if (index !== -1) {
    users[index] = updatedUser;
    localStorage.setItem("registeredUsers", JSON.stringify(users));
  }
};

// Add document to a user
export const addDocumentToUser = (userId: string, document: Document): void => {
  const users = getAllUsers();
  const userIndex = users.findIndex(user => user.id === userId);
  
  if (userIndex !== -1) {
    users[userIndex].documents.push(document);
    localStorage.setItem("registeredUsers", JSON.stringify(users));
  }
};

// Get user by email
export const getUserByEmail = (email: string): User | undefined => {
  const users = getAllUsers();
  return users.find(user => user.email === email);
};

// Authenticate user
export const authenticateUser = (email: string, password: string): User | null => {
  const users = getAllUsers();
  console.log("Authenticating:", email, "Users available:", users);
  const user = users.find(user => user.email === email && user.password === password);
  return user || null;
};
