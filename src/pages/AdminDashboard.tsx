import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, FileUp, Pencil, Trash2, User, Users, Plus, Mail, LogOut, RefreshCw } from "lucide-react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getAllUsers, 
  createUser, 
  addUserToFirestore,
  deleteUser as deleteFirebaseUser,
  uploadDocument,
  getUserDocuments,
  deleteDocument,
  updateUserData,
  resetUserPassword,
  logoutUser
} from "@/lib/firebase";

const AdminDashboard = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<{[key: string]: boolean}>({});
  const [documentName, setDocumentName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin) {
      navigate("/login");
      toast({
        title: "Acesso negado",
        description: "Você precisa ter acesso administrativo para acessar esta página.",
        variant: "destructive",
      });
      return;
    }
    
    loadUsers();
  }, [navigate, toast, isAdmin]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/login");
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado da área de administrador.",
      });
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao tentar sair.",
        variant: "destructive",
      });
    }
  };

  const toggleUserExpand = async (userId: string) => {
    setExpandedUsers(prev => {
      const isExpanding = !prev[userId];
      
      if (isExpanding) {
        loadUserDocuments(userId);
      }
      
      return {
        ...prev,
        [userId]: isExpanding
      };
    });
  };

  const loadUserDocuments = async (userId: string) => {
    try {
      const documents = await getUserDocuments(userId);
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, documents } : user
        )
      );
    } catch (error) {
      console.error("Erro ao carregar documentos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os documentos do usuário.",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = (user: any) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      await deleteFirebaseUser(selectedUser.id);
      
      setUsers(prevUsers => prevUsers.filter(user => user.id !== selectedUser.id));
      setIsDeleteDialogOpen(false);
      
      toast({
        title: "Usuário excluído",
        description: `O usuário ${selectedUser.name} foi excluído com sucesso.`,
      });
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o usuário.",
        variant: "destructive",
      });
    }
  };

  const saveEditedUser = async () => {
    if (!selectedUser) return;
    
    try {
      await updateUserData(selectedUser.id, {
        name: editName,
        email: editEmail
      });
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === selectedUser.id ? { ...user, name: editName, email: editEmail } : user
        )
      );
      
      setIsEditDialogOpen(false);
      toast({
        title: "Usuário atualizado",
        description: "As informações do usuário foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o usuário.",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = (user: any) => {
    setSelectedUser(user);
    setIsResetPasswordDialogOpen(true);
  };

  const confirmResetPassword = async () => {
    if (!selectedUser || !selectedUser.email) return;
    
    try {
      await resetUserPassword(selectedUser.email);
      setIsResetPasswordDialogOpen(false);
      
      toast({
        title: "Email de redefinição enviado",
        description: `Um email de redefinição de senha foi enviado para ${selectedUser.email}.`,
      });
    } catch (error: any) {
      console.error("Erro ao redefinir senha:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o email de redefinição de senha.",
        variant: "destructive",
      });
    }
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return "A senha deve ter no mínimo 8 caracteres";
    }
    return "";
  };

  const handleCreateUser = async () => {
    if (createPassword !== confirmPassword) {
      setPasswordError("As senhas não coincidem");
      toast({
        title: "Erro no cadastro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    const passwordValidation = validatePassword(createPassword);
    if (passwordValidation) {
      setPasswordError(passwordValidation);
      toast({
        title: "Erro no cadastro",
        description: passwordValidation,
        variant: "destructive",
      });
      return;
    }

    try {
      const userCredential = await createUser(createEmail, createPassword);
      
      await addUserToFirestore(userCredential.uid, {
        name: createName,
        email: createEmail,
        role: "client"
      });
      
      const newUser = {
        id: userCredential.uid,
        name: createName,
        email: createEmail,
        role: "client",
        documents: []
      };
      
      setUsers(prevUsers => [...prevUsers, newUser]);
      
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      setConfirmPassword("");
      setPasswordError("");
      setIsCreateDialogOpen(false);
      
      toast({
        title: "Usuário criado",
        description: "O novo usuário foi criado com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      const errorMessage = error.code === "auth/email-already-in-use" 
        ? "Este email já está registrado" 
        : "Erro ao criar usuário";
      
      toast({
        title: "Erro no cadastro",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (userId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      await uploadDocument(userId, file, { name: documentName || file.name });
      
      await loadUserDocuments(userId);
      
      setDocumentName("");
      
      toast({
        title: "Documento adicionado",
        description: `O documento foi adicionado ao usuário com sucesso.`,
      });
    } catch (error) {
      console.error("Erro ao fazer upload do arquivo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload do documento.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (userId: string, documentId: string, fileUrl: string) => {
    try {
      await deleteDocument(userId, documentId, fileUrl);
      
      setUsers(prevUsers => 
        prevUsers.map(user => {
          if (user.id === userId) {
            return {
              ...user,
              documents: user.documents.filter((doc: any) => doc.id !== documentId)
            };
          }
          return user;
        })
      );
      
      toast({
        title: "Documento excluído",
        description: "O documento foi excluído com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o documento.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gold">Painel do Administrador</h1>
          <Button 
            onClick={handleLogout}
            variant="outline" 
            className="border-gold text-gold hover:bg-gold hover:text-navy flex items-center gap-2"
          >
            <LogOut size={16} />
            Sair
          </Button>
        </div>
        
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Users className="text-gold h-6 w-6" />
              <h2 className="text-xl font-semibold text-white">Usuários Registrados</h2>
            </div>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gold hover:bg-gold-light text-navy flex items-center gap-2"
            >
              <Plus size={16} />
              Criar Novo Usuário
            </Button>
          </div>
          
          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <User className="mx-auto h-12 w-12 mb-3 opacity-30" />
              <p>Nenhum usuário registrado ainda.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-gray-800/50">
                  <TableHead className="text-gray-400">Nome</TableHead>
                  <TableHead className="text-gray-400">Email</TableHead>
                  <TableHead className="text-gray-400">Tipo de Conta</TableHead>
                  <TableHead className="text-gray-400">Documentos</TableHead>
                  <TableHead className="text-gray-400 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <React.Fragment key={user.id}>
                    <TableRow className="border-gray-800 hover:bg-gray-800/50">
                      <TableCell className="font-medium text-white">{user.name}</TableCell>
                      <TableCell className="text-gray-300">{user.email}</TableCell>
                      <TableCell className="text-gray-300">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.role === "admin" ? "bg-purple-900 text-purple-200" : "bg-blue-900 text-blue-200"
                        }`}>
                          {user.role === "admin" ? "Administrador" : "Cliente"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-gray-400 hover:text-white"
                          onClick={() => toggleUserExpand(user.id)}
                        >
                          {user.documents?.length || 0} documentos
                          {expandedUsers[user.id] ? (
                            <ChevronUp className="ml-2 h-4 w-4" />
                          ) : (
                            <ChevronDown className="ml-2 h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/30"
                          onClick={() => handleEditUser(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-950/30"
                          onClick={() => handleResetPassword(user)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                          onClick={() => handleDeleteUser(user)}
                          disabled={user.role === "admin"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    
                    {expandedUsers[user.id] && (
                      <TableRow className="bg-gray-800/30 hover:bg-gray-800/50 border-0">
                        <TableCell colSpan={5} className="p-4">
                          <div className="space-y-4">
                            <div className="flex flex-col md:flex-row gap-3 p-3 bg-gray-800/50 rounded-md">
                              <div className="flex-grow">
                                <Input
                                  type="text"
                                  placeholder="Nome do documento"
                                  className="bg-gray-700 border-gray-600"
                                  value={documentName}
                                  onChange={(e) => setDocumentName(e.target.value)}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  id={`file-upload-${user.id}`}
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(user.id, e)}
                                />
                                <Button 
                                  variant="outline"
                                  className="border-gold text-gold hover:bg-gold hover:text-navy flex gap-2 w-full md:w-auto"
                                  onClick={() => document.getElementById(`file-upload-${user.id}`)?.click()}
                                >
                                  <FileUp className="h-4 w-4" />
                                  Adicionar Documento
                                </Button>
                              </div>
                            </div>
                            
                            {user.documents?.length > 0 ? (
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-300 mb-2">Documentos Enviados</h4>
                                <div className="divide-y divide-gray-800">
                                  {user.documents.map((doc: any) => (
                                    <div key={doc.id} className="py-2 flex items-center justify-between">
                                      <div>
                                        <p className="text-white font-medium">{doc.name}</p>
                                        <p className="text-xs text-gray-400">
                                          Enviado em: {new Date(doc.uploadedAt).toLocaleDateString('pt-BR')}
                                        </p>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                                          onClick={() => handleDeleteDocument(user.id, doc.id, doc.fileUrl)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400 italic">Nenhum documento enviado.</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
      
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-gray-400">
              Você tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="py-3">
              <p className="text-white"><strong>Nome:</strong> {selectedUser.name}</p>
              <p className="text-white"><strong>Email:</strong> {selectedUser.email}</p>
            </div>
          )}
          
          <DialogFooter className="flex space-x-2 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDeleteUser}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Usuário</DialogTitle>
            <DialogDescription className="text-gray-400">
              Faça alterações nas informações do usuário e clique em salvar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right text-white">
                Nome
              </Label>
              <Input
                id="name"
                className="col-span-3 bg-gray-800 border-gray-700 text-white"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right text-white">
                Email
              </Label>
              <Input
                id="email"
                className="col-span-3 bg-gray-800 border-gray-700 text-white"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              className="bg-gold hover:bg-gold-light text-navy"
              onClick={saveEditedUser}
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Redefinir Senha</DialogTitle>
            <DialogDescription className="text-gray-400">
              Você está prestes a enviar um email de redefinição de senha para este usuário.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="py-3">
              <p className="text-white"><strong>Nome:</strong> {selectedUser.name}</p>
              <p className="text-white"><strong>Email:</strong> {selectedUser.email}</p>
            </div>
          )}
          
          <DialogFooter className="flex space-x-2 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setIsResetPasswordDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              className="bg-gold hover:bg-gold-light text-navy"
              onClick={confirmResetPassword}
            >
              Enviar Email de Redefinição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Criar Novo Usuário</DialogTitle>
            <DialogDescription className="text-gray-400">
              Preencha as informações para criar uma nova conta de usuário.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name" className="text-white">
                Nome Completo
              </Label>
              <div className="relative">
                <User 
                  className="absolute left-3 top-3 h-5 w-5 text-gray-400" 
                />
                <Input
                  id="create-name"
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-email" className="text-white">
                Email
              </Label>
              <div className="relative">
                <Mail 
                  className="absolute left-3 top-3 h-5 w-5 text-gray-400" 
                />
                <Input
                  id="create-email"
                  type="email"
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="Email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-password" className="text-white">
                Senha
              </Label>
              <div className="relative">
                <Lock 
                  className="absolute left-3 top-3 h-5 w-5 text-gray-400" 
                />
                <Input
                  id="create-password"
                  type="password"
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                  value={createPassword}
                  onChange={(e) => {
                    setCreatePassword(e.target.value);
                    setPasswordError(validatePassword(e.target.value));
                  }}
                  placeholder="Senha (mínimo 8 caracteres)"
                  required
                />
              </div>
              {passwordError && (
                <Alert variant="destructive" className="py-2 mt-1 bg-red-950 border-red-800">
                  <AlertDescription className="text-xs">{passwordError}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-white">
                Confirmar Senha
              </Label>
              <div className="relative">
                <Lock 
                  className="absolute left-3 top-3 h-5 w-5 text-gray-400" 
                />
                <Input
                  id="confirm-password"
                  type="password"
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmar senha"
                  required
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setCreateName("");
                setCreateEmail("");
                setCreatePassword("");
                setConfirmPassword("");
                setPasswordError("");
              }}
              className="mr-2"
            >
              Cancelar
            </Button>
            <Button 
              className="bg-gold hover:bg-gold-light text-navy"
              onClick={handleCreateUser}
              disabled={!createName || !createEmail || !createPassword || !confirmPassword || Boolean(passwordError)}
            >
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
};

export default AdminDashboard;
