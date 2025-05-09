
import { FileText, Lock, ArrowDown, ArrowUp, ArrowUpDown, Trash2, Edit } from "lucide-react";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDate } from "./utils/dateUtils";
import { useNavigate } from "react-router-dom";
import type { UserTableProps } from "./types/userTable";
import { useUserProfileData } from "@/hooks/upload/useUserProfileData";
import { EditNameDialog } from "./components/EditNameDialog";

export const UserTable = ({
  users,
  userInfoList,
  title,
  setSelectedUserId,
  setSelectedUserForPasswordChange,
  passwordForm,
  refreshUsers,
  showDocumentButton = true,
  isAdminSection = false
}: UserTableProps) => {
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const navigate = useNavigate();
  
  const {
    isEditingUser,
    newName,
    setNewName,
    nameError,
    getUserName,
    handleEditName,
    handleSaveName,
    cancelEditing
  } = useUserProfileData(refreshUsers);
  
  const getUserInfo = (authUserId: string) => {
    return userInfoList.find(u => u.id === authUserId) || null;
  };

  const toggleSort = () => {
    if (sortDirection === null) {
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortDirection(null);
    }
  };

  const getSortIcon = () => {
    if (sortDirection === 'asc') return <ArrowUp size={16} />;
    if (sortDirection === 'desc') return <ArrowDown size={16} />;
    return <ArrowUpDown size={16} />;
  };

  // Sort users by name if sort direction is set
  const sortedUsers = [...users].sort((a, b) => {
    if (sortDirection === null) return 0;
    
    const nameA = a.user_metadata?.name || "Sem nome";
    const nameB = b.user_metadata?.name || "Sem nome";
    
    if (sortDirection === 'asc') {
      return nameA.localeCompare(nameB);
    } else {
      return nameB.localeCompare(nameA);
    }
  });

  // Handle document button click
  const handleDocumentButtonClick = (userId: string) => {
    navigate(`/admin/user-documents/${userId}`);
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-3 text-navy dark:text-gold">{title}</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-gold/20">
              {!isAdminSection && (
                <TableHead className="text-navy dark:text-gold font-medium uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span>Nome</span>
                    <Button
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6 p-0"
                      onClick={toggleSort}
                      aria-label={sortDirection === 'asc' ? 'Ordenar de Z a A' : 'Ordenar de A a Z'}
                    >
                      {getSortIcon()}
                    </Button>
                  </div>
                </TableHead>
              )}
              <TableHead className="text-navy dark:text-gold font-medium uppercase tracking-wider">Email</TableHead>
              <TableHead className="text-navy dark:text-gold font-medium uppercase tracking-wider">Data de Cadastro</TableHead>
              {!isAdminSection && (
                <TableHead className="text-navy dark:text-gold font-medium uppercase tracking-wider">Ações</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="text-navy dark:text-white">
            {sortedUsers.length > 0 ? (
              sortedUsers.map(authUser => {
                const userInfo = getUserInfo(authUser.id);
                const displayName = getUserName(authUser);
                const isEditing = isEditingUser === authUser.id;
                
                return (
                  <TableRow key={authUser.id} className="border-gold/20 hover:bg-orange-300/50 dark:hover:bg-navy-light/50">
                    {!isAdminSection && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {displayName}
                          {displayName === "Sem nome" && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 p-0" 
                              onClick={() => handleEditName(authUser)}
                              aria-label="Criar nome"
                            >
                              <Edit size={14} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>{authUser.email || "Sem email"}</TableCell>
                    <TableCell>{formatDate(authUser.created_at)}</TableCell>
                    {!isAdminSection && (
                      <TableCell>
                        <div className="flex flex-wrap space-x-2 gap-y-2">
                          {showDocumentButton && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex items-center gap-1 bg-orange-300/80 dark:bg-navy-light/80 text-navy dark:text-white hover:bg-gold hover:text-navy dark:hover:bg-gold dark:hover:text-navy border-gold/20" 
                              onClick={() => handleDocumentButtonClick(authUser.id)}
                              aria-label={`Ver documentos de ${authUser.user_metadata?.name || authUser.email || "usuário"}`}
                            >
                              <FileText size={14} />
                              <span>Documentos</span>
                            </Button>
                          )}
                          {userInfo && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1 bg-orange-300/80 dark:bg-navy-light/80 text-navy dark:text-white hover:bg-gold hover:text-navy dark:hover:bg-gold dark:hover:text-navy border-gold/20"
                              onClick={() => {
                                setSelectedUserForPasswordChange(userInfo);
                                passwordForm.reset();
                              }}
                              aria-label={`Alterar senha de ${authUser.user_metadata?.name || authUser.email || "usuário"}`}
                            >
                              <Lock size={14} />
                              <span>Senha</span>
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-1 bg-orange-300/80 dark:bg-navy-light/80 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white border-gold/20"
                            onClick={() => {
                              // Delete user action would go here
                              if (confirm('Deseja realmente excluir este usuário?')) {
                                refreshUsers();
                              }
                            }}
                            aria-label={`Excluir ${authUser.user_metadata?.name || authUser.email || "usuário"}`}
                          >
                            <Trash2 size={14} />
                            <span>Excluir</span>
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            ) : (
              <TableRow className="border-gold/20">
                <TableCell colSpan={isAdminSection ? 2 : 4} className="text-center py-4 text-navy/60 dark:text-white/60">
                  Nenhum {title.toLowerCase()} encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <EditNameDialog
        isOpen={!!isEditingUser}
        onClose={cancelEditing}
        name={newName}
        setName={setNewName}
        onSave={() => isEditingUser && handleSaveName(isEditingUser)}
        error={nameError}
      />
    </div>
  );
};
