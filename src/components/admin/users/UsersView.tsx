
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  Mail, 
  Settings, 
  FileText, 
  Calendar,
  Filter,
  SortAsc
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UseFormReturn } from "react-hook-form";

interface UsersViewProps {
  users: any[];
  supabaseUsers: any[];
  isLoadingUsers: boolean;
  isLoadingAuthUsers: boolean;
  handleDocumentButtonClick: (userId: string) => void;
  setSelectedUserForPasswordChange: (user: any) => void;
  passwordForm: UseFormReturn<any, any, undefined>;
  refreshUsers: () => void;
  createUser: (data: any) => Promise<void>;
  isCreatingUser: boolean;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  supabaseUsers,
  isLoadingUsers,
  isLoadingAuthUsers,
  handleDocumentButtonClick,
  setSelectedUserForPasswordChange,
  refreshUsers,
  createUser,
  isCreatingUser
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at");

  // Filter and combine users
  const combinedUsers = supabaseUsers.map(authUser => {
    const userInfo = users.find(u => u.id === authUser.id);
    return {
      ...authUser,
      ...userInfo,
      displayName: userInfo?.name || authUser.email?.split('@')[0] || 'Usuário'
    };
  });

  const filteredUsers = combinedUsers.filter(user => 
    user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedUsers = filteredUsers.sort((a, b) => {
    if (sortBy === "created_at") {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }
    return a.displayName.localeCompare(b.displayName);
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'fiscal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'contabil': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (isLoadingUsers || isLoadingAuthUsers) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#efc349] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-white/70 font-extralight">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-[#020817] dark:text-[#efc349] mb-4 font-extralight">
          Gerenciar Usuários
        </h1>
        <p className="text-gray-600 dark:text-white/70 font-extralight">
          Gerencie usuários, permissões e documentos do sistema
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 font-extralight"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSortBy(sortBy === "created_at" ? "name" : "created_at")}
                className="bg-transparent border-[#efc349]/30 text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight"
              >
                <SortAsc className="h-4 w-4 mr-2" />
                {sortBy === "created_at" ? "Data" : "Nome"}
              </Button>
              <Button
                variant="outline"
                className="bg-transparent border-[#efc349]/30 text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table/Cards */}
      <div className="hidden lg:block">
        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 dark:border-[#efc349]/30">
                  <tr>
                    <th className="text-left p-4 text-[#020817] dark:text-[#efc349] font-extralight">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Usuário
                      </div>
                    </th>
                    <th className="text-left p-4 text-[#020817] dark:text-[#efc349] font-extralight">Função</th>
                    <th className="text-left p-4 text-[#020817] dark:text-[#efc349] font-extralight">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Cadastro
                      </div>
                    </th>
                    <th className="text-right p-4 text-[#020817] dark:text-[#efc349] font-extralight">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 dark:border-[#efc349]/10 hover:bg-gray-50 dark:hover:bg-[#efc349]/5">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#efc349]/20 flex items-center justify-center">
                            <span className="text-sm font-extralight text-[#020817] dark:text-[#efc349]">
                              {user.displayName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-[#020817] dark:text-white font-extralight">{user.displayName}</p>
                            <p className="text-sm text-gray-600 dark:text-white/70 font-extralight">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={getRoleColor(user.role || 'client')}>
                          {user.role || 'Cliente'}
                        </Badge>
                      </td>
                      <td className="p-4 text-gray-600 dark:text-white/70 font-extralight">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDocumentButtonClick(user.id)}
                            className="bg-transparent border-[#efc349]/30 text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedUserForPasswordChange(user)}
                            className="bg-transparent border-[#efc349]/30 text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {sortedUsers.map((user) => (
          <Card key={user.id} className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-[#efc349]/20 flex items-center justify-center">
                    <span className="text-lg font-extralight text-[#020817] dark:text-[#efc349]">
                      {user.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-[#020817] dark:text-white font-extralight">{user.displayName}</p>
                    <p className="text-sm text-gray-600 dark:text-white/70 font-extralight">{user.email}</p>
                  </div>
                </div>
                <Badge className={getRoleColor(user.role || 'client')}>
                  {user.role || 'Cliente'}
                </Badge>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-white/70 font-extralight">Cadastro:</span>
                  <span className="text-sm text-[#020817] dark:text-white font-extralight">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDocumentButtonClick(user.id)}
                    className="flex-1 bg-transparent border-[#efc349]/30 text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Documentos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedUserForPasswordChange(user)}
                    className="flex-1 bg-transparent border-[#efc349]/30 text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {sortedUsers.length === 0 && (
        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
          <CardContent className="p-12 text-center">
            <div className="text-gray-400 dark:text-white/40 mb-4">
              <Mail className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg text-[#020817] dark:text-white mb-2 font-extralight">
              Nenhum usuário encontrado
            </h3>
            <p className="text-gray-600 dark:text-white/70 font-extralight">
              {searchTerm ? 'Tente ajustar os filtros de busca' : 'Ainda não há usuários cadastrados no sistema'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Floating Action Button */}
      <Button
        onClick={() => {/* Add user creation logic */}}
        className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-[#020817] border-2 border-[#efc349] text-[#efc349] hover:bg-[#efc349] hover:text-[#020817] shadow-lg z-50 font-extralight"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
};
