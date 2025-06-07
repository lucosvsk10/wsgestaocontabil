
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, Key, Plus, Loader2 } from 'lucide-react';
import { CreateUser } from './CreateUser';
import { UserTable } from './UserTable';
import { UseFormReturn } from 'react-hook-form';

interface UserManagementViewProps {
  supabaseUsers: any[];
  users: any[];
  userInfoList: any[];
  isLoadingUsers: boolean;
  isLoadingAuthUsers: boolean;
  handleDocumentButtonClick: (userId: string) => void;
  setSelectedUserForPasswordChange: (user: any) => void;
  passwordForm: UseFormReturn<any>;
  refreshUsers: () => void;
  createUser: (data: any) => Promise<void>;
  isCreatingUser: boolean;
}

const UserManagementView: React.FC<UserManagementViewProps> = ({
  supabaseUsers,
  users,
  userInfoList,
  isLoadingUsers,
  isLoadingAuthUsers,
  handleDocumentButtonClick,
  setSelectedUserForPasswordChange,
  passwordForm,
  refreshUsers,
  createUser,
  isCreatingUser
}) => {
  const totalUsers = supabaseUsers.length;
  const activeUsers = supabaseUsers.filter(user => user.email_confirmed_at).length;
  const adminUsers = users.filter(user => user.role === 'admin').length;

  if (isLoadingUsers || isLoadingAuthUsers) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#efc349] mx-auto mb-4 animate-spin" />
          <p className="text-[#020817] dark:text-white font-extralight">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl text-[#020817] dark:text-[#efc349] mb-4 font-extralight">
          Gerenciamento de Usuários
        </h1>
        <p className="text-gray-600 dark:text-white/70 font-extralight">
          Gerencie usuários, permissões e documentos do sistema
        </p>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-white/70 font-extralight">Total de Usuários</p>
                  <p className="text-2xl font-extralight text-[#020817] dark:text-[#efc349]">{totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-white/70 font-extralight">Usuários Ativos</p>
                  <p className="text-2xl font-extralight text-[#020817] dark:text-[#efc349]">{activeUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Key className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-white/70 font-extralight">Administradores</p>
                  <p className="text-2xl font-extralight text-[#020817] dark:text-[#efc349]">{adminUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create User Section */}
      <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#020817] dark:text-[#efc349] font-extralight">
            <Plus className="h-5 w-5" />
            Criar Novo Usuário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CreateUser 
            createUser={createUser}
            isCreatingUser={isCreatingUser}
            refreshUsers={refreshUsers}
          />
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#020817] dark:text-[#efc349] font-extralight">
            <Users className="h-5 w-5" />
            Lista de Usuários
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UserTable
            supabaseUsers={supabaseUsers}
            users={users}
            userInfoList={userInfoList}
            handleDocumentButtonClick={handleDocumentButtonClick}
            setSelectedUserForPasswordChange={setSelectedUserForPasswordChange}
            refreshUsers={refreshUsers}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagementView;
