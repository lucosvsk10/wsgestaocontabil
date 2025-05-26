
import { useState } from "react";
import { Search, Mail, Settings, MoreVertical, Eye, Lock, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "../utils/dateUtils";
import type { UserTableProps } from "../types/userTable";

export const PremiumUserTable = ({
  users,
  userInfoList,
  title,
  setSelectedUserId,
  setSelectedUserForPasswordChange,
  showDocumentButton = true,
  isAdminSection = false
}: UserTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_metadata?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedUsers = filteredUsers.sort((a, b) => {
    const nameA = a.user_metadata?.name || a.email || '';
    const nameB = b.user_metadata?.name || b.email || '';
    return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
  });

  const getUserInfo = (authUserId: string) => {
    return userInfoList.find(u => u.id === authUserId) || null;
  };

  const handleDocumentButtonClick = (userId: string) => {
    if (setSelectedUserId) {
      setSelectedUserId(userId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-[#efc349] text-2xl font-museo-moderno font-semibold mb-2">
            {title}
          </h2>
          <p className="text-[#b3b3b3] font-bebas-neue text-sm">
            {sortedUsers.length} usuário{sortedUsers.length !== 1 ? 's' : ''} encontrado{sortedUsers.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#b3b3b3] w-4 h-4" />
            <Input
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#0b0f1c] border-[#efc349]/30 text-[#ffffff] placeholder-[#b3b3b3] font-bebas-neue"
            />
          </div>
          
          <Button 
            variant="outline"
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="bg-[#0b0f1c] border-[#efc349]/30 text-[#efc349] hover:bg-[#efc349]/10 font-bebas-neue"
          >
            <Filter className="w-4 h-4 mr-2" />
            {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
          </Button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-[#0b0f1c] border border-[#efc349] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#efc349]/5 border-b border-[#efc349]/20">
                {!isAdminSection && (
                  <th className="text-left p-4 text-[#efc349] font-bebas-neue text-sm tracking-wider uppercase">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Nome
                    </div>
                  </th>
                )}
                <th className="text-left p-4 text-[#efc349] font-bebas-neue text-sm tracking-wider uppercase">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </div>
                </th>
                <th className="text-left p-4 text-[#efc349] font-bebas-neue text-sm tracking-wider uppercase">
                  Data de Cadastro
                </th>
                {!isAdminSection && (
                  <th className="text-left p-4 text-[#efc349] font-bebas-neue text-sm tracking-wider uppercase">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Ações
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((authUser, index) => {
                const userInfo = getUserInfo(authUser.id);
                const displayName = authUser.user_metadata?.name || "Sem nome";
                
                return (
                  <tr 
                    key={authUser.id} 
                    className={`transition-all duration-300 hover:bg-[#ffffff]/5 ${
                      index % 2 === 1 ? 'bg-[#ffffff]/[0.015]' : ''
                    }`}
                  >
                    {!isAdminSection && (
                      <td className="p-4 text-[#ffffff] font-bebas-neue">
                        {displayName}
                      </td>
                    )}
                    <td className="p-4 text-[#b3b3b3] font-bebas-neue">
                      {authUser.email}
                    </td>
                    <td className="p-4 text-[#b3b3b3] font-bebas-neue">
                      {formatDate(authUser.created_at)}
                    </td>
                    {!isAdminSection && (
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {showDocumentButton && (
                            <Button
                              onClick={() => handleDocumentButtonClick(authUser.id)}
                              className="bg-[#1e293b] hover:bg-[#efc349] hover:text-[#020817] text-[#ffffff] font-bebas-neue transition-all duration-300 text-xs px-3 py-1"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Documentos
                            </Button>
                          )}
                          
                          {userInfo && (
                            <Button
                              onClick={() => setSelectedUserForPasswordChange(userInfo)}
                              className="bg-[#374151] hover:bg-[#4b5563] text-[#ffffff] font-bebas-neue transition-all duration-300 text-xs px-3 py-1"
                            >
                              <Lock className="w-3 h-3 mr-1" />
                              Senha
                            </Button>
                          )}
                          
                          <Button
                            className="bg-[#7f1d1d] hover:bg-[#dc2626] text-[#ffffff] font-bebas-neue transition-all duration-300 text-xs px-3 py-1"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Excluir
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {sortedUsers.map((authUser) => {
          const userInfo = getUserInfo(authUser.id);
          const displayName = authUser.user_metadata?.name || "Sem nome";
          
          return (
            <div key={authUser.id} className="bg-[#0b0f1c] border border-[#efc349]/30 rounded-xl p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-[#ffffff] font-bebas-neue font-medium">
                    {displayName}
                  </h3>
                  <p className="text-[#b3b3b3] font-bebas-neue text-sm">
                    {authUser.email}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="text-[#b3b3b3]">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex justify-between items-center text-xs text-[#b3b3b3] font-bebas-neue mb-3">
                <span>Cadastrado em</span>
                <span>{formatDate(authUser.created_at)}</span>
              </div>
              
              {!isAdminSection && (
                <div className="flex flex-wrap gap-2">
                  {showDocumentButton && (
                    <Button
                      onClick={() => handleDocumentButtonClick(authUser.id)}
                      className="bg-[#1e293b] hover:bg-[#efc349] hover:text-[#020817] text-[#ffffff] font-bebas-neue transition-all duration-300 text-xs px-3 py-1 flex-1"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Documentos
                    </Button>
                  )}
                  
                  {userInfo && (
                    <Button
                      onClick={() => setSelectedUserForPasswordChange(userInfo)}
                      className="bg-[#374151] hover:bg-[#4b5563] text-[#ffffff] font-bebas-neue transition-all duration-300 text-xs px-3 py-1"
                    >
                      <Lock className="w-3 h-3" />
                    </Button>
                  )}
                  
                  <Button
                    className="bg-[#7f1d1d] hover:bg-[#dc2626] text-[#ffffff] font-bebas-neue transition-all duration-300 text-xs px-3 py-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sortedUsers.length === 0 && (
        <div className="text-center py-12 bg-[#0b0f1c] border border-[#efc349]/30 rounded-xl">
          <p className="text-[#b3b3b3] font-bebas-neue">
            Nenhum usuário encontrado
          </p>
        </div>
      )}
    </div>
  );
};
