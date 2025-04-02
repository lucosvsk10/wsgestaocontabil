import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, FileUp, Pencil, Trash2, User, Users, Plus, Lock, Mail } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { removeUser } from "../data/users";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState({});
  const [documentName, setDocumentName] = useState("");
  
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth");
    if (adminAuth !== "true") {
      navigate("/login");
      toast({
        title: "Acesso negado",
        description: "Você precisa fazer login como administrador para acessar esta página.",
        variant: "destructive",
      });
    }
    
    loadUsers();
  }, [navigate, toast]);

  const loadUsers = () => {
    const registeredUsers = localStorage.getItem("registeredUsers");
    if (registeredUsers) {
      const parsedUsers = JSON.parse(registeredUsers);
      const usersWithDocuments = parsedUsers.map(user => ({
        ...user,
        documents: user.documents || []
      }));
      setUsers(usersWithDocuments);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminAuth");
    navigate("/login");
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado da área de administrador.",
    });
  };

  const toggleUserExpand = (userId) => {
    setExpandedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = () => {
    if (!selectedUser) return;
    
    removeUser(selectedUser.id);
    loadUsers();
    setIsDeleteDialogOpen(false);
    
    toast({
      title: "Usuário excluído",
      description: `O usuário ${selectedUser.name} foi excluído com sucesso.`,
    });
  };

  const saveEditedUser = () => {
    if (!selectedUser) return;
    
    const updatedUsers = users.map(user => {
      if (user.email === selectedUser.email) {
        return {
          ...user,
          name: editName,
          email: editEmail
        };
      }
      return user;
    });
    
    localStorage.setItem("registeredUsers", JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
    setIsEditDialogOpen(false);
    
    toast({
      title: "Usuário atualizado",
      description: `As informações do usuário foram atualizadas com sucesso.`,
    });
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      return "A senha deve ter no mínimo 8 caracteres";
    }
    return "";
  };

  const handleCreateUser = () => {
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

    const emailExists = users.some(user => user.email === createEmail);
    if (emailExists) {
      toast({
        title: "Erro no cadastro",
        description: "Este email já está registrado.",
        variant: "destructive",
      });
      return;
    }

    const newUser = {
      name: createName,
      email: createEmail,
      password: createPassword,
      documents: []
    };

    const updatedUsers = [...users, newUser];
    localStorage.setItem("registeredUsers", JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
    
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
  };

  const handleFileUpload = (userId, event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const documentEntry = {
      id: Date.now().toString(),
      name: documentName || file.name,
      uploadedAt: new Date().toISOString(),
      mockUrl: URL.createObjectURL(file)
    };
    
    const updatedUsers = users.map(user => {
      if (user.email === userId) {
        return {
          ...user,
          documents: [...(user.documents || []), documentEntry]
        };
      }
      return user;
    });
    
    localStorage.setItem("registeredUsers", JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
    setDocumentName("");
    
    toast({
      title: "Documento adicionado",
      description: `O documento foi adicionado ao usuário com sucesso.`,
    });
  };

  const handleDeleteDocument = (userId, documentId) => {
    const updatedUsers = users.map(user => {
      if (user.email === userId) {
        return {
          ...user,
          documents: user.documents.filter(doc => doc.id !== documentId)
        };
      }
      return user;
    });
    
    localStorage.setItem("registeredUsers", JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
    
    toast({
      title: "Documento excluído",
      description: `O documento foi excluído com sucesso.`,
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gold">Painel do Administrador</h1>
          <Button 
            onClick={handleLogout}
            variant="outline" 
            className="border-gold text-gold hover:bg-gold hover:text-navy"
          >
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
                  <TableHead className="text-gray-400">Documentos</TableHead>
                  <TableHead className="text-gray-400 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <React.Fragment key={user.email}>
                    <TableRow className="border-gray-800 hover:bg-gray-800/50">
                      <TableCell className="font-medium text-white">{user.name}</TableCell>
                      <TableCell className="text-gray-300">{user.email}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-gray-400 hover:text-white"
                          onClick={() => toggleUserExpand(user.email)}
                        >
                          {user.documents?.length || 0} documentos
                          {expandedUsers[user.email] ? (
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
                          className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                          onClick={() => handleDeleteUser(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    
                    {expandedUsers[user.email] && (
                      <TableRow className="bg-gray-800/30 hover:bg-gray-800/50 border-0">
                        <TableCell colSpan={4} className="p-4">
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
                                  id={`file-upload-${user.email}`}
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(user.email, e)}
                                />
                                <Button 
                                  variant="outline"
                                  className="border-gold text-gold hover:bg-gold hover:text-navy flex gap-2 w-full md:w-auto"
                                  onClick={() => document.getElementById(`file-upload-${user.email}`).click()}
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
                                  {user.documents.map(doc => (
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
                                          onClick={() => handleDeleteDocument(user.email, doc.id)}
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
                  <AlertTitle className="text-xs">{passwordError}</AlertTitle>
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
