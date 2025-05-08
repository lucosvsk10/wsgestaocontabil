
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserList } from "@/components/admin/UserList";
import { CreateUser } from "@/components/admin/CreateUser";
import { PasswordChangeForm } from "@/components/admin/PasswordChangeForm";
import { StorageStats } from "@/components/admin/StorageStats";
import { UserType } from "@/types/admin";

interface AdminTabsViewProps {
  supabaseUsers: any[];
  users: UserType[];
  isLoadingUsers: boolean;
  isLoadingAuthUsers: boolean;
  handleDocumentButtonClick: (userId: string) => void;
  setSelectedUserForPasswordChange: (user: UserType) => void;
  passwordForm: any;
  refreshUsers: () => void;
  createUser: (data: any) => void;
  isCreatingUser: boolean;
}

export const AdminTabsView = ({
  supabaseUsers,
  users,
  isLoadingUsers,
  isLoadingAuthUsers,
  handleDocumentButtonClick,
  setSelectedUserForPasswordChange,
  passwordForm,
  refreshUsers,
  createUser,
  isCreatingUser
}: AdminTabsViewProps) => {
  return (
    <Tabs defaultValue="users" className="space-y-6">
      <TabsList className="grid grid-cols-4 mb-4 bg-white dark:bg-navy-dark border border-gold/20">
        <TabsTrigger 
          value="users" 
          className="text-navy dark:text-white data-[state=active]:bg-gold data-[state=active]:text-navy"
        >
          Lista de Usuários
        </TabsTrigger>
        <TabsTrigger 
          value="create-user" 
          className="text-navy dark:text-white data-[state=active]:bg-gold data-[state=active]:text-navy"
        >
          Criar Usuário
        </TabsTrigger>
        <TabsTrigger 
          value="change-password" 
          className="text-navy dark:text-white data-[state=active]:bg-gold data-[state=active]:text-navy"
        >
          Alterar Senha
        </TabsTrigger>
        <TabsTrigger 
          value="storage" 
          className="text-navy dark:text-white data-[state=active]:bg-gold data-[state=active]:text-navy"
        >
          Armazenamento
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="users" className="space-y-6">
        <UserList 
          supabaseUsers={supabaseUsers} 
          users={users} 
          isLoading={isLoadingUsers || isLoadingAuthUsers} 
          setSelectedUserId={handleDocumentButtonClick} 
          setSelectedUserForPasswordChange={setSelectedUserForPasswordChange} 
          passwordForm={passwordForm} 
          refreshUsers={refreshUsers} 
        />
      </TabsContent>
      
      <TabsContent value="create-user" className="bg-white dark:bg-navy-dark border border-gold/20 rounded-lg p-6 shadow-md">
        <CreateUser createUser={createUser} isCreatingUser={isCreatingUser} />
      </TabsContent>
      
      <TabsContent value="change-password" className="bg-white dark:bg-navy-dark border border-gold/20 rounded-lg p-6 shadow-md">
        <PasswordChangeForm />
      </TabsContent>
      
      <TabsContent value="storage" className="bg-white dark:bg-navy-dark border border-gold/20 rounded-lg p-6 shadow-md">
        <StorageStats />
      </TabsContent>
    </Tabs>
  );
};
