
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, FileUp, Pencil, Trash2, User, Users } from "lucide-react";
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

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState({});
  const [documentName, setDocumentName] = useState("");
  
  // Edit form state
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if admin is authenticated
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
    
    // Load users
    loadUsers();
  }, [navigate, toast]);

  const loadUsers = () => {
    const registeredUsers = localStorage.getItem("registeredUsers");
    if (registeredUsers) {
      const parsedUsers = JSON.parse(registeredUsers);
      // Add documents array if it doesn't exist
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
    
    const updatedUsers = users.filter(user => user.email !== selectedUser.email);
    localStorage.setItem("registeredUsers", JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
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

  const handleFileUpload = (userId, event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Simulating file upload - in a real app, we would upload to a server
    // Here we're just storing the file name and a mock URL
    const documentEntry = {
      id: Date.now().toString(),
      name: documentName || file.name,
      uploadedAt: new Date().toISOString(),
      mockUrl: URL.createObjectURL(file) // This will work for the current session only
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
          <div className="flex items-center gap-3 mb-4">
            <Users className="text-gold h-6 w-6" />
            <h2 className="text-xl font-semibold text-white">Usuários Registrados</h2>
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
                    
                    {/* Document upload and listing section */}
                    {expandedUsers[user.email] && (
                      <TableRow className="bg-gray-800/30 hover:bg-gray-800/50 border-0">
                        <TableCell colSpan={4} className="p-4">
                          <div className="space-y-4">
                            {/* Document upload form */}
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
                            
                            {/* Document list */}
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
      
      {/* Delete Confirmation Dialog */}
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
      
      {/* Edit User Dialog */}
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
      
      <Footer />
    </div>
  );
};

export default AdminDashboard;
